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
import {
  CashierMovement,
  CashierMovementType,
} from './entities/cashier-movement.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentMethod } from '../payments/enums/payment-method.enum';
import { OpenCashierSessionDto } from './dto/create-cashier.dto';
import { CloseCashierSessionDto } from './dto/close-cashier.dto';
import { AddCashierMovementDto } from './dto/add-cashier-movement.dto';
import { PaginatedCashierSessionsDto } from './dto/paginated-cashier-sessions.dto';
import { CashierSessionListItemDto } from './dto/cashier-session-list-item.dto';

@Injectable()
export class CashierService {
  constructor(
    @InjectRepository(CashierSession)
    private readonly cashierSessionRepository: Repository<CashierSession>,
    @InjectRepository(CashierMovement)
    private readonly cashierMovementRepository: Repository<CashierMovement>,
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

    // Calculate expected amount (opening + cash payments + movements during the session)
    const now = new Date();

    // 1. Cash payments during the session
    const cashPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod: PaymentMethod.CASH,
      })
      .andWhere('payment.paymentDate BETWEEN :openedAt AND :now', {
        openedAt: session.openedAt,
        now,
      })
      .getRawOne();

    const cashPaymentsTotal = parseFloat(cashPayments?.total || '0');

    // 2. Cashier movements (CASH_IN and CASH_OUT)
    const movements = await this.cashierMovementRepository.find({
      where: { cashierSessionId: session.id, tenantId },
    });

    let movementsTotal = 0;
    movements.forEach((movement) => {
      const amount = parseFloat(movement.amount.toString());
      if (movement.type === CashierMovementType.CASH_IN) {
        movementsTotal += amount;
      } else if (movement.type === CashierMovementType.CASH_OUT) {
        movementsTotal -= amount;
      }
    });

    // Expected = Opening + Cash Payments + (Cash In - Cash Out)
    const expectedAmount =
      parseFloat(session.openingAmount.toString()) +
      cashPaymentsTotal +
      movementsTotal;
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
   * Calculate sales breakdown for a session
   */
  private async calculateSalesBreakdown(
    sessionOpenedAt: Date,
    sessionClosedAt: Date | null,
    tenantId: number,
  ): Promise<{ reservationSales: number; posSales: number }> {
    const endDate = sessionClosedAt || new Date();

    // Get all cash payments during the session with folio relations
    const cashPayments = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.folio', 'folio')
      .leftJoinAndSelect('folio.reservation', 'reservation')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod: PaymentMethod.CASH,
      })
      .andWhere('payment.paymentDate BETWEEN :openedAt AND :endDate', {
        openedAt: sessionOpenedAt,
        endDate,
      })
      .getMany();

    let reservationSales = 0;
    let posSales = 0;

    cashPayments.forEach((payment) => {
      const amount = parseFloat(payment.amount.toString());
      // If payment has a folio with a reservation, it's reservation sales
      if (payment.folio && payment.folio.reservation) {
        reservationSales += amount;
      } else {
        // Otherwise it's POS sales (products, services, etc.)
        posSales += amount;
      }
    });

    return {
      reservationSales: parseFloat(reservationSales.toFixed(2)),
      posSales: parseFloat(posSales.toFixed(2)),
    };
  }

  /**
   * Get a single cashier session by publicId
   */
  async findOne(publicId: string, tenantId: number): Promise<any> {
    const session = await this.cashierSessionRepository.findOne({
      where: { publicId, tenantId },
      relations: ['openedByUser', 'closedByUser'],
    });

    if (!session) {
      throw new NotFoundException(
        `Cashier session with ID ${publicId} not found`,
      );
    }

    // Load movements for this session
    const movements = await this.cashierMovementRepository.find({
      where: { cashierSessionId: session.id, tenantId },
      relations: ['createdByUser'],
      order: { movementDate: 'ASC' },
    });

    // Calculate sales breakdown
    const salesBreakdown = await this.calculateSalesBreakdown(
      session.openedAt,
      session.closedAt,
      tenantId,
    );

    return {
      ...session,
      movements,
      reservationSales: salesBreakdown.reservationSales,
      posSales: salesBreakdown.posSales,
    };
  }

  /**
   * Get current open session for tenant
   */
  async getCurrentSession(tenantId: number): Promise<any | null> {
    const session = await this.cashierSessionRepository.findOne({
      where: { tenantId, status: CashierSessionStatus.OPEN },
      relations: ['openedByUser'],
    });

    if (!session) {
      return null;
    }

    // Load movements for this session
    const movements = await this.cashierMovementRepository.find({
      where: { cashierSessionId: session.id, tenantId },
      relations: ['createdByUser'],
      order: { movementDate: 'ASC' },
    });

    // Calculate sales breakdown
    const salesBreakdown = await this.calculateSalesBreakdown(
      session.openedAt,
      session.closedAt,
      tenantId,
    );

    return {
      ...session,
      movements,
      reservationSales: salesBreakdown.reservationSales,
      posSales: salesBreakdown.posSales,
    };
  }

  /**
   * Add a cash movement to an open session (cash in or cash out)
   */
  async addMovement(
    sessionPublicId: string,
    dto: AddCashierMovementDto,
    userId: number,
    tenantId: number,
  ): Promise<CashierMovement> {
    // Find the session
    const session = await this.cashierSessionRepository.findOne({
      where: { publicId: sessionPublicId, tenantId },
    });

    if (!session) {
      throw new NotFoundException(
        `Cashier session with ID ${sessionPublicId} not found`,
      );
    }

    if (session.status === CashierSessionStatus.CLOSED) {
      throw new BadRequestException(
        'Cannot add movements to a closed cashier session',
      );
    }

    // Create movement
    const movement = this.cashierMovementRepository.create({
      tenantId,
      cashierSessionId: session.id,
      createdBy: userId,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason,
      movementDate: new Date(),
    });

    return await this.cashierMovementRepository.save(movement);
  }

  /**
   * Get all movements for a cashier session
   */
  async getMovements(
    sessionPublicId: string,
    tenantId: number,
  ): Promise<CashierMovement[]> {
    // Find the session
    const session = await this.cashierSessionRepository.findOne({
      where: { publicId: sessionPublicId, tenantId },
    });

    if (!session) {
      throw new NotFoundException(
        `Cashier session with ID ${sessionPublicId} not found`,
      );
    }

    // Get movements with user info
    const movements = await this.cashierMovementRepository.find({
      where: { cashierSessionId: session.id, tenantId },
      relations: ['createdByUser'],
      order: { movementDate: 'ASC' },
    });

    return movements;
  }
}
