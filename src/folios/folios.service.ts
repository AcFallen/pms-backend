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
import { AddPaymentToFolioDto } from './dto/add-payment-to-folio.dto';
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

  async create(
    createFolioDto: CreateFolioDto,
    tenantId: number,
  ): Promise<Folio> {
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
   * Add payment to existing folio
   * This registers a payment for an existing folio (created automatically with reservation)
   * Updates folio balance and status if fully paid
   */
  async addPayment(
    dto: AddPaymentToFolioDto,
    tenantId: number,
  ): Promise<Folio> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find folio by publicId
      const folio = await queryRunner.manager.findOne(Folio, {
        where: {
          publicId: dto.folioPublicId,
          tenantId,
        },
      });

      if (!folio) {
        throw new NotFoundException(
          `Folio with publicId ${dto.folioPublicId} not found`,
        );
      }

      // 2. Validate folio is not already closed
      if (folio.status === FolioStatus.CLOSED) {
        throw new BadRequestException(
          `Folio ${folio.folioNumber} is already CLOSED. Cannot add payment to closed folio.`,
        );
      }

      // 3. Validate payment amount doesn't exceed balance
      const currentBalance = parseFloat(folio.balance.toString());
      if (dto.amount > currentBalance) {
        throw new BadRequestException(
          `Payment amount (${dto.amount}) exceeds folio balance (${currentBalance})`,
        );
      }

      // 4. Generate reference number if not provided
      const referenceNumber =
        dto.referenceNumber ||
        (await this.generatePaymentReferenceNumber(queryRunner, tenantId));

      // 5. Register payment
      const payment = new Payment();
      payment.folioId = folio.id;
      payment.paymentMethod = dto.paymentMethod;
      payment.amount = dto.amount;
      payment.referenceNumber = referenceNumber;
      payment.paymentDate = new Date();
      payment.notes = dto.notes || 'Payment registered';
      payment.tenantId = tenantId;

      await queryRunner.manager.save(Payment, payment);

      // 6. Update folio balance
      const newBalance = currentBalance - dto.amount;

      // 7. Update folio status to CLOSED if fully paid
      if (newBalance <= 0) {
        await queryRunner.manager.update(
          Folio,
          { id: folio.id },
          {
            status: FolioStatus.CLOSED,
            balance: 0,
            closedAt: new Date(),
          },
        );
        folio.status = FolioStatus.CLOSED;
        folio.balance = 0;
        folio.closedAt = new Date();
      } else {
        await queryRunner.manager.update(
          Folio,
          { id: folio.id },
          { balance: newBalance },
        );
        folio.balance = newBalance;
      }

      await queryRunner.commitTransaction();
      return folio;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
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
