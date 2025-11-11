import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  CashierSession,
  CashierSessionStatus,
} from './entities/cashier.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/enums/payment-method.enum';
import { OpenCashierSessionDto } from './dto/create-cashier.dto';
import { CloseCashierSessionDto } from './dto/close-cashier.dto';
import { PaginatedCashierSessionsDto } from './dto/paginated-cashier-sessions.dto';
import { CashierSessionListItemDto } from './dto/cashier-session-list-item.dto';

@Injectable()
export class CashierService {
  constructor(
    @InjectRepository(CashierSession)
    private readonly cashierSessionRepository: Repository<CashierSession>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Open a new cashier session
   */
  async openSession(
    dto: OpenCashierSessionDto,
    userId: number,
    tenantId: number,
  ): Promise<CashierSession> {
    // Check if there's already an open session for this tenant
    const existingOpenSession = await this.cashierSessionRepository.findOne({
      where: { tenantId, status: CashierSessionStatus.OPEN },
    });

    if (existingOpenSession) {
      throw new ConflictException(
        'There is already an open cashier session. Please close it before opening a new one.',
      );
    }

    const session = this.cashierSessionRepository.create({
      tenantId,
      openedBy: userId,
      status: CashierSessionStatus.OPEN,
      openingAmount: dto.openingAmount,
      openingNotes: dto.openingNotes,
      openedAt: new Date(),
    });

    return await this.cashierSessionRepository.save(session);
  }

  /**
   * Close an existing cashier session
   */
  async closeSession(
    publicId: string,
    dto: CloseCashierSessionDto,
    userId: number,
    tenantId: number,
  ): Promise<CashierSession> {
    // Find the session
    const session = await this.cashierSessionRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!session) {
      throw new NotFoundException(
        `Cashier session with ID ${publicId} not found`,
      );
    }

    if (session.status === CashierSessionStatus.CLOSED) {
      throw new BadRequestException('This cashier session is already closed');
    }

    // Calculate expected amount (opening amount + cash payments during the session)
    const cashPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod: PaymentMethod.CASH,
      })
      .andWhere('payment.paymentDate BETWEEN :openedAt AND :now', {
        openedAt: session.openedAt,
        now: new Date(),
      })
      .getRawOne();

    const cashPaymentsTotal = parseFloat(cashPayments?.total || '0');
    const expectedAmount =
      parseFloat(session.openingAmount.toString()) + cashPaymentsTotal;
    const difference =
      parseFloat(dto.countedAmount.toString()) - expectedAmount;

    // Update session
    session.status = CashierSessionStatus.CLOSED;
    session.closedBy = userId;
    session.closedAt = new Date();
    session.expectedAmount = parseFloat(expectedAmount.toFixed(2));
    session.countedAmount = dto.countedAmount;
    session.difference = parseFloat(difference.toFixed(2));
    session.closingNotes = dto.closingNotes || '';

    return await this.cashierSessionRepository.save(session);
  }

  /**
   * Get all cashier sessions with pagination
   */
  async findAll(
    tenantId: number,
    page = 1,
    limit = 10,
  ): Promise<PaginatedCashierSessionsDto> {
    const query = this.cashierSessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.openedByUser', 'openedByUser')
      .leftJoinAndSelect('session.closedByUser', 'closedByUser')
      .where('session.tenantId = :tenantId', { tenantId })
      .orderBy('session.openedAt', 'DESC');

    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    const [sessions, total] = await query.getManyAndCount();

    const data: CashierSessionListItemDto[] = sessions.map((session) => ({
      publicId: session.publicId,
      status: session.status,
      openingAmount: parseFloat(session.openingAmount.toString()),
      expectedAmount: session.expectedAmount
        ? parseFloat(session.expectedAmount.toString())
        : null,
      countedAmount: session.countedAmount
        ? parseFloat(session.countedAmount.toString())
        : null,
      difference: session.difference
        ? parseFloat(session.difference.toString())
        : null,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openedByUser: {
        publicId: session.openedByUser.publicId,
        email: session.openedByUser.email,
        firstName: session.openedByUser.firstName,
        lastName: session.openedByUser.lastName,
      },
      closedByUser: session.closedByUser
        ? {
            publicId: session.closedByUser.publicId,
            email: session.closedByUser.email,
            firstName: session.closedByUser.firstName,
            lastName: session.closedByUser.lastName,
          }
        : null,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get a single cashier session by publicId
   */
  async findOne(publicId: string, tenantId: number): Promise<CashierSession> {
    const session = await this.cashierSessionRepository.findOne({
      where: { publicId, tenantId },
      relations: ['openedByUser', 'closedByUser'],
    });

    if (!session) {
      throw new NotFoundException(
        `Cashier session with ID ${publicId} not found`,
      );
    }

    return session;
  }

  /**
   * Get current open session for tenant
   */
  async getCurrentSession(tenantId: number): Promise<CashierSession | null> {
    const session = await this.cashierSessionRepository.findOne({
      where: { tenantId, status: CashierSessionStatus.OPEN },
      relations: ['openedByUser'],
    });

    return session;
  }
}
