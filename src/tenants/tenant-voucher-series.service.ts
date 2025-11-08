import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TenantVoucherSeries } from './entities/tenant-voucher-series.entity';
import { CreateVoucherSeriesDto } from './dto/create-voucher-series.dto';
import { UpdateVoucherSeriesDto } from './dto/update-voucher-series.dto';
import { VoucherType } from './enums/voucher-type.enum';

@Injectable()
export class TenantVoucherSeriesService {
  constructor(
    @InjectRepository(TenantVoucherSeries)
    private readonly voucherSeriesRepository: Repository<TenantVoucherSeries>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea una nueva serie de comprobantes para un tenant
   */
  async create(
    createDto: CreateVoucherSeriesDto,
    tenantId: number,
  ): Promise<TenantVoucherSeries> {
    // Verificar si ya existe la serie para este tenant y tipo de comprobante
    const existingSeries = await this.voucherSeriesRepository.findOne({
      where: {
        tenantId,
        voucherType: createDto.voucherType,
        series: createDto.series.toUpperCase(),
      },
    });

    if (existingSeries) {
      throw new ConflictException(
        `La serie ${createDto.series} ya existe para este tipo de comprobante`,
      );
    }

    // Si se marca como default, desactivar otras series default del mismo tipo
    if (createDto.isDefault) {
      await this.voucherSeriesRepository.update(
        {
          tenantId,
          voucherType: createDto.voucherType,
          isDefault: true,
        },
        { isDefault: false },
      );
    }

    const voucherSeries = this.voucherSeriesRepository.create({
      ...createDto,
      series: createDto.series.toUpperCase(),
      tenantId,
    });

    return this.voucherSeriesRepository.save(voucherSeries);
  }

  /**
   * Obtiene todas las series de un tenant
   */
  async findAll(tenantId: number): Promise<TenantVoucherSeries[]> {
    return this.voucherSeriesRepository.find({
      where: { tenantId },
      order: {
        voucherType: 'ASC',
        series: 'ASC',
      },
    });
  }

  /**
   * Obtiene todas las series activas de un tenant filtradas por tipo
   */
  async findActiveByType(
    tenantId: number,
    voucherType: VoucherType,
  ): Promise<TenantVoucherSeries[]> {
    return this.voucherSeriesRepository.find({
      where: {
        tenantId,
        voucherType,
        isActive: true,
      },
      order: {
        isDefault: 'DESC',
        series: 'ASC',
      },
    });
  }

  /**
   * Obtiene la serie por defecto para un tipo de comprobante
   */
  async findDefaultByType(
    tenantId: number,
    voucherType: VoucherType,
  ): Promise<TenantVoucherSeries> {
    const defaultSeries = await this.voucherSeriesRepository.findOne({
      where: {
        tenantId,
        voucherType,
        isDefault: true,
        isActive: true,
      },
    });

    if (!defaultSeries) {
      throw new NotFoundException(
        `No se encontró una serie por defecto activa para ${voucherType}`,
      );
    }

    return defaultSeries;
  }

  /**
   * Obtiene una serie por su publicId
   */
  async findByPublicId(
    publicId: string,
    tenantId: number,
  ): Promise<TenantVoucherSeries> {
    const series = await this.voucherSeriesRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!series) {
      throw new NotFoundException('Serie de comprobante no encontrada');
    }

    return series;
  }

  /**
   * Actualiza una serie de comprobantes
   */
  async update(
    publicId: string,
    updateDto: UpdateVoucherSeriesDto,
    tenantId: number,
  ): Promise<TenantVoucherSeries> {
    const series = await this.findByPublicId(publicId, tenantId);

    // Si se marca como default, desactivar otras series default del mismo tipo
    if (updateDto.isDefault && !series.isDefault) {
      await this.voucherSeriesRepository.update(
        {
          tenantId,
          voucherType: series.voucherType,
          isDefault: true,
        },
        { isDefault: false },
      );
    }

    // Si se intenta cambiar la serie, verificar que no exista
    if (updateDto.series && updateDto.series !== series.series) {
      const existingSeries = await this.voucherSeriesRepository.findOne({
        where: {
          tenantId,
          voucherType: series.voucherType,
          series: updateDto.series.toUpperCase(),
        },
      });

      if (existingSeries) {
        throw new ConflictException(
          `La serie ${updateDto.series} ya existe para este tipo de comprobante`,
        );
      }

      updateDto.series = updateDto.series.toUpperCase();
    }

    Object.assign(series, updateDto);
    return this.voucherSeriesRepository.save(series);
  }

  /**
   * Elimina (desactiva) una serie de comprobantes
   */
  async remove(publicId: string, tenantId: number): Promise<void> {
    const series = await this.findByPublicId(publicId, tenantId);

    if (series.isDefault) {
      throw new BadRequestException(
        'No se puede eliminar la serie por defecto. Primero asigna otra serie como predeterminada.',
      );
    }

    await this.voucherSeriesRepository.update(
      { id: series.id },
      { isActive: false },
    );
  }

  /**
   * Obtiene el siguiente número de comprobante e incrementa el correlativo
   * Esta operación debe ser atómica para evitar duplicados
   */
  async getNextVoucherNumber(
    publicId: string,
    tenantId: number,
  ): Promise<{ series: string; number: number; fullNumber: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Bloquear la fila para evitar condiciones de carrera
      const series = await queryRunner.manager
        .createQueryBuilder(TenantVoucherSeries, 'series')
        .setLock('pessimistic_write')
        .where('series.publicId = :publicId', { publicId })
        .andWhere('series.tenantId = :tenantId', { tenantId })
        .andWhere('series.isActive = :isActive', { isActive: true })
        .getOne();

      if (!series) {
        throw new NotFoundException(
          'Serie de comprobante no encontrada o inactiva',
        );
      }

      const currentNumber = series.currentNumber;
      const fullNumber = series.getNextVoucherNumber();

      // Incrementar el número
      await queryRunner.manager.update(
        TenantVoucherSeries,
        { id: series.id },
        { currentNumber: currentNumber + 1 },
      );

      await queryRunner.commitTransaction();

      return {
        series: series.series,
        number: currentNumber,
        fullNumber,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Inicializa las series por defecto para un nuevo tenant
   */
  async initializeDefaultSeries(tenantId: number): Promise<void> {
    const defaultSeries = [
      {
        voucherType: VoucherType.FACTURA,
        series: 'F001',
        isDefault: true,
        description: 'Serie por defecto para facturas',
      },
      {
        voucherType: VoucherType.BOLETA,
        series: 'B001',
        isDefault: true,
        description: 'Serie por defecto para boletas',
      },
      {
        voucherType: VoucherType.NOTA_CREDITO,
        series: 'FC01',
        isDefault: true,
        description: 'Serie por defecto para notas de crédito',
      },
      {
        voucherType: VoucherType.NOTA_DEBITO,
        series: 'FD01',
        isDefault: true,
        description: 'Serie por defecto para notas de débito',
      },
    ];

    for (const seriesData of defaultSeries) {
      await this.create(seriesData as CreateVoucherSeriesDto, tenantId);
    }
  }
}
