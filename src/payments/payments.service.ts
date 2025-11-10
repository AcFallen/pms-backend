import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentToFolioDto } from './dto/create-payment-to-folio.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { Folio } from '../folios/entities/folio.entity';
import { FolioStatus } from '../folios/enums/folio-status.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    tenantId: number,
  ): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      tenantId,
    });
    return this.paymentRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['folio'],
      order: {
        paymentDate: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['folio'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findByPublicId(publicId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { publicId },
      relations: ['folio'],
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with public ID ${publicId} not found`,
      );
    }

    return payment;
  }

  async findByFolioId(folioId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { folioId },
      relations: ['folio'],
      order: {
        paymentDate: 'DESC',
      },
    });
  }

  async update(
    id: number,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    const payment = await this.findOne(id);

    Object.assign(payment, updatePaymentDto);
    return this.paymentRepository.save(payment);
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentRepository.remove(payment);
  }

  /**
   * Creates a payment for an existing folio and updates folio balance.
   * If the payment covers the remaining balance, the folio is automatically closed.
   *
   * This method:
   * 1. Validates the folio exists and is open
   * 2. Validates the payment amount doesn't exceed the balance
   * 3. Creates the payment with auto-generated reference number if not provided
   * 4. Updates the folio balance
   * 5. Closes the folio if balance reaches zero
   */
  async createPaymentToFolio(
    dto: CreatePaymentToFolioDto,
    tenantId: number,
  ): Promise<Payment> {
    // Use QueryRunner for transaction management
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

      // 2. Validate folio is open
      if (folio.status !== FolioStatus.OPEN) {
        throw new BadRequestException(
          `Cannot add payment to folio ${folio.folioNumber}. Folio status is ${folio.status}. Only OPEN folios can receive payments.`,
        );
      }

      // 3. Validate payment amount
      const currentBalance = parseFloat(folio.balance.toString());
      if (dto.amount > currentBalance) {
        throw new BadRequestException(
          `Payment amount ($${dto.amount}) exceeds folio balance ($${currentBalance})`,
        );
      }

      // 4. Generate reference number if not provided
      const referenceNumber =
        dto.referenceNumber ||
        (await this.generatePaymentReferenceNumber(queryRunner, tenantId));

      // 5. Create payment
      const payment = new Payment();
      payment.folioId = folio.id;
      payment.paymentMethod = dto.paymentMethod;
      payment.amount = dto.amount;
      payment.referenceNumber = referenceNumber;
      payment.paymentDate = new Date();
      payment.notes = dto.notes || 'Additional payment';
      payment.tenantId = tenantId;

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // 6. Update folio balance
      const newBalance = currentBalance - dto.amount;

      // 7. Close folio if balance is zero
      if (newBalance <= 0) {
        await queryRunner.manager.update(
          Folio,
          { id: folio.id },
          {
            balance: 0,
            status: FolioStatus.CLOSED,
            closedAt: new Date(),
          },
        );
      } else {
        await queryRunner.manager.update(
          Folio,
          { id: folio.id },
          {
            balance: newBalance,
          },
        );
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedPayment;
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
