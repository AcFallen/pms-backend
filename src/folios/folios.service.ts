import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CreateFolioDto } from './dto/create-folio.dto';
import { UpdateFolioDto } from './dto/update-folio.dto';
import { CreateFolioWithPaymentDto } from './dto/create-folio-with-payment.dto';
import { Folio } from './entities/folio.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Payment } from '../payments/entities/payment.entity';
import { FolioStatus } from './enums/folio-status.enum';

@Injectable()
export class FoliosService {
  constructor(
    @InjectRepository(Folio)
    private readonly folioRepository: Repository<Folio>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createFolioDto: CreateFolioDto, tenantId: number): Promise<Folio> {
    // Check if folio number already exists
    const existingFolio = await this.folioRepository.findOne({
      where: { folioNumber: createFolioDto.folioNumber },
    });

    if (existingFolio) {
      throw new ConflictException(
        `Folio with number ${createFolioDto.folioNumber} already exists`,
      );
    }

    const folio = this.folioRepository.create({
      ...createFolioDto,
      tenantId,
    });
    return this.folioRepository.save(folio);
  }

  async findAll(): Promise<Folio[]> {
    return this.folioRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Folio> {
    const folio = await this.folioRepository.findOne({
      where: { id },
    });

    if (!folio) {
      throw new NotFoundException(`Folio with ID ${id} not found`);
    }

    return folio;
  }

  async findByPublicId(publicId: string): Promise<Folio> {
    const folio = await this.folioRepository.findOne({
      where: { publicId },
    });

    if (!folio) {
      throw new NotFoundException(`Folio with public ID ${publicId} not found`);
    }

    return folio;
  }

  async update(id: number, updateFolioDto: UpdateFolioDto): Promise<Folio> {
    const folio = await this.findOne(id);

    // If updating folio number, check for conflicts
    if (
      updateFolioDto.folioNumber &&
      updateFolioDto.folioNumber !== folio.folioNumber
    ) {
      const existingFolio = await this.folioRepository.findOne({
        where: { folioNumber: updateFolioDto.folioNumber },
      });

      if (existingFolio) {
        throw new ConflictException(
          `Folio with number ${updateFolioDto.folioNumber} already exists`,
        );
      }
    }

    Object.assign(folio, updateFolioDto);
    return this.folioRepository.save(folio);
  }

  async remove(id: number): Promise<void> {
    const folio = await this.findOne(id);
    await this.folioRepository.remove(folio);
  }

  /**
   * Creates a folio with payment for an existing reservation.
   * This method:
   * 1. Validates the reservation exists and belongs to the tenant
   * 2. Creates a folio for the reservation
   * 3. Registers the payment
   * 4. Updates folio status to CLOSED if payment covers total amount
   *
   * NOTE: This does NOT create or modify the reservation.
   * The reservation must already exist (created via POST /reservations).
   */
  async createWithPayment(
    dto: CreateFolioWithPaymentDto,
    tenantId: number,
  ): Promise<Folio> {
    // Use QueryRunner for transaction management
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find reservation by publicId
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: {
          publicId: dto.reservationPublicId,
          tenantId,
        },
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation with publicId ${dto.reservationPublicId} not found`,
        );
      }

      // 2. Validate reservation doesn't already have a folio
      const existingFolio = await queryRunner.manager.findOne(Folio, {
        where: {
          reservationId: reservation.id,
          tenantId,
        },
      });

      if (existingFolio) {
        throw new BadRequestException(
          `Reservation ${dto.reservationPublicId} already has a folio (${existingFolio.folioNumber})`,
        );
      }

      // 3. Generate folio number (format: FOL-YYYY-XXXXX)
      const folioNumber = await this.generateFolioNumber(queryRunner, tenantId);

      // 4. Get total amount from reservation
      const totalAmount = parseFloat(reservation.totalAmount);

      // 5. Create folio
      const folio = new Folio();
      folio.reservationId = reservation.id;
      folio.folioNumber = folioNumber;
      folio.status = FolioStatus.OPEN;
      folio.subtotal = totalAmount;
      folio.tax = 0;
      folio.total = totalAmount;
      folio.balance = totalAmount - dto.payment.amount;
      folio.notes = dto.folioNotes || 'Folio created with payment';
      folio.tenantId = tenantId;

      const savedFolio = await queryRunner.manager.save(Folio, folio);

      // 6. Generate reference number if not provided
      const referenceNumber = dto.payment.referenceNumber ||
        await this.generatePaymentReferenceNumber(queryRunner, tenantId);

      // 7. Register payment
      const payment = new Payment();
      payment.folioId = savedFolio.id;
      payment.paymentMethod = dto.payment.paymentMethod;
      payment.amount = dto.payment.amount;
      payment.referenceNumber = referenceNumber;
      payment.paymentDate = new Date();
      payment.notes = dto.payment.notes || 'Payment registered';
      payment.tenantId = tenantId;

      await queryRunner.manager.save(Payment, payment);

      // 7. Update folio status to CLOSED if payment covers total amount
      if (dto.payment.amount >= totalAmount) {
        await queryRunner.manager.update(Folio,
          { id: savedFolio.id },
          {
            status: FolioStatus.CLOSED,
            balance: 0,
            closedAt: new Date(),
          }
        );
        savedFolio.status = FolioStatus.CLOSED;
        savedFolio.balance = 0;
        savedFolio.closedAt = new Date();
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedFolio;

    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

  /**
   * Generates a unique folio number in format: FOL-YYYY-XXXXX
   * @param queryRunner - QueryRunner instance for transaction context
   * @param tenantId - Tenant ID for scoping
   * @returns Generated folio number
   */
  private async generateFolioNumber(
    queryRunner: QueryRunner,
    tenantId: number,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const folioCount = await queryRunner.manager.count(Folio, {
      where: { tenantId },
    });
    const folioNumber = `FOL-${year}-${String(folioCount + 1).padStart(5, '0')}`;
    return folioNumber;
  }

  /**
   * Generates a unique payment reference number in format: PAY-YYYY-XXXXX
   * @param queryRunner - QueryRunner instance for transaction context
   * @param tenantId - Tenant ID for scoping
   * @returns Generated reference number
   */
  private async generatePaymentReferenceNumber(
    queryRunner: QueryRunner,
    tenantId: number,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const paymentCount = await queryRunner.manager.count(Payment, {
      where: { tenantId },
    });
    const referenceNumber = `PAY-${year}-${String(paymentCount + 1).padStart(5, '0')}`;
    return referenceNumber;
  }
}
