import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Folio } from '../folios/entities/folio.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { ReservationStatus } from '../reservations/enums/reservation-status.enum';
import { PaymentMethod } from '../payments/enums/payment-method.enum';
import { InvoiceStatus } from '../invoices/enums/invoice-status.enum';
import {
  DashboardMetricsDto,
  PaymentMethodIncomeDto,
  RoomTypeIncomeDto,
  IncomeSunatComparisonDto,
  CashInvoicesDto,
  PosWalkInSalesDto,
  RecentReservationDto,
} from './dto/dashboard-metrics.dto';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Folio)
    private readonly folioRepository: Repository<Folio>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  async getMetrics(
    tenantId: number,
    filters: DashboardFiltersDto,
  ): Promise<DashboardMetricsDto> {
    // TODO: Remove static values after UI is ready

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Determine date range: use filters if provided, otherwise use current month
    let monthStart: Date;
    let monthEnd: Date;

    if (filters.startDate && filters.endDate) {
      // Use provided date range
      monthStart = new Date(filters.startDate);
      monthStart.setHours(0, 0, 0, 0);

      monthEnd = new Date(filters.endDate);
      monthEnd.setHours(23, 59, 59, 999);
    } else if (filters.startDate) {
      // Only start date provided, use it as start and end of that month
      const startDate = new Date(filters.startDate);
      monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      monthEnd = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
    } else if (filters.endDate) {
      // Only end date provided, use first day of that month to end date
      const endDate = new Date(filters.endDate);
      monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      monthEnd = new Date(filters.endDate);
      monthEnd.setHours(23, 59, 59, 999);
    } else {
      // No filters, use current month
      monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // 1. Número de check-ins hoy (reservas que hicieron check-in hoy, independientemente del estado actual)
    const checkInsToday = await this.reservationRepository.count({
      where: {
        tenantId,
        checkInTime: Between(todayStart, todayEnd),
      },
    });

    // 2. Ingresos por método de pago (del mes actual)
    const incomeByPaymentMethod = await this.getIncomeByPaymentMethod(
      tenantId,
      monthStart,
      monthEnd,
    );

    // 3. Ingresos declarados a SUNAT vs no declarados
    const sunatComparison = await this.getSunatComparison(
      tenantId,
      monthStart,
      monthEnd,
    );

    // 4. Ingresos por tipo de habitación
    const incomeByRoomType = await this.getIncomeByRoomType(
      tenantId,
      monthStart,
      monthEnd,
    );

    // 5. Documentos generados este mes
    const documentsGenerated = await this.invoiceRepository.count({
      where: {
        tenantId,
        createdAt: Between(monthStart, monthEnd),
        status: InvoiceStatus.ACCEPTED,
      },
    });

    // 6. Facturas declaradas a SUNAT pero pagadas en efectivo
    const cashInvoices = await this.getCashInvoices(
      tenantId,
      monthStart,
      monthEnd,
    );

    // 7. Ventas del POS (walk-ins sin reserva)
    const posWalkInSales = await this.getPosWalkInSales(
      tenantId,
      monthStart,
      monthEnd,
    );

    // 8. Últimas 5 reservas con check-in (CHECKED_IN)
    const recentCheckIns = await this.getRecentReservations(
      tenantId,
      ReservationStatus.CHECKED_IN,
      5,
    );

    // 9. Últimas 5 reservas con check-out (CHECKED_OUT)
    const recentCheckOuts = await this.getRecentReservations(
      tenantId,
      ReservationStatus.CHECKED_OUT,
      5,
    );

    return {
      checkInsToday,
      incomeByPaymentMethod,
      sunatComparison,
      incomeByRoomType,
      documentsGenerated,
      cashInvoices,
      posWalkInSales,
      recentCheckIns,
      recentCheckOuts,
    };
  }

  private async getIncomeByPaymentMethod(
    tenantId: number,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<PaymentMethodIncomeDto[]> {
    const result = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.paymentMethod', 'paymentMethod')
      .addSelect('SUM(payment.amount)', 'totalIncome')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.paymentDate BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .groupBy('payment.paymentMethod')
      .getRawMany();

    // Crear un mapa con los resultados
    const incomeMap = new Map<PaymentMethod, number>();
    result.forEach((item) => {
      incomeMap.set(
        item.paymentMethod as PaymentMethod,
        parseFloat(item.totalIncome || '0'),
      );
    });

    // Retornar TODOS los métodos de pago, incluso los que no tienen ingresos (con 0)
    return Object.values(PaymentMethod).map((method) => ({
      paymentMethod: method,
      totalIncome: incomeMap.get(method) || 0,
    }));
  }

  private async getSunatComparison(
    tenantId: number,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<IncomeSunatComparisonDto> {
    // Total de ingresos del mes (pagos realizados en el mes)
    const totalIncomeResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.paymentDate BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .getRawOne();

    const totalIncome = parseFloat(totalIncomeResult?.total || '0');

    // Ingresos declarados a SUNAT: suma del total de las facturas ACEPTADAS del mes
    // IMPORTANTE: Ahora usamos invoice.total que refleja solo los cargos incluidos en la factura
    // (con includedInInvoice = true), no el monto total del pago o folio
    const declaredResult = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(invoice.total)', 'total')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.createdAt BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ACCEPTED })
      .getRawOne();

    const declaredToSunat = parseFloat(declaredResult?.total || '0');

    // Ingresos no declarados = total de ingresos - declarado a SUNAT
    const notDeclared = totalIncome - declaredToSunat;

    // Porcentaje de declaración
    const declarationPercentage =
      totalIncome > 0 ? (declaredToSunat / totalIncome) * 100 : 0;

    return {
      declaredToSunat,
      notDeclared: notDeclared > 0 ? notDeclared : 0,
      declarationPercentage: parseFloat(declarationPercentage.toFixed(2)),
    };
  }

  private async getIncomeByRoomType(
    tenantId: number,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<RoomTypeIncomeDto[]> {
    const result = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select('roomType.publicId', 'roomTypePublicId')
      .addSelect('roomType.name', 'roomTypeName')
      .addSelect('SUM(reservation.totalAmount)', 'totalIncome')
      .leftJoin('reservation.roomType', 'roomType')
      .where('reservation.tenantId = :tenantId', { tenantId })
      .andWhere('reservation.createdAt BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .groupBy('roomType.publicId')
      .addGroupBy('roomType.name')
      .getRawMany();

    return result.map((item) => ({
      roomTypePublicId: item.roomTypePublicId,
      roomTypeName: item.roomTypeName,
      totalIncome: parseFloat(item.totalIncome || '0'),
    }));
  }

  private async getCashInvoices(
    tenantId: number,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<CashInvoicesDto> {
    // Obtener facturas aceptadas del mes con sus folios y pagos
    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.folio', 'folio')
      .leftJoinAndSelect('folio.payments', 'payment')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.createdAt BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ACCEPTED })
      .getMany();

    let totalCashInvoiced = 0;
    let countInvoicesWithCash = 0;

    // Calcular la proporción de efectivo para cada factura
    for (const invoice of invoices) {
      if (
        !invoice.folio ||
        !invoice.folio.payments ||
        invoice.folio.payments.length === 0
      ) {
        continue;
      }

      // Calcular el total de pagos del folio
      const totalPayments = invoice.folio.payments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount.toString()),
        0,
      );

      // Calcular el total de pagos en efectivo
      const cashPayments = invoice.folio.payments
        .filter((payment) => payment.paymentMethod === PaymentMethod.CASH)
        .reduce(
          (sum, payment) => sum + parseFloat(payment.amount.toString()),
          0,
        );

      // Si hubo pagos en efectivo, calcular la proporción del monto facturado
      if (cashPayments > 0 && totalPayments > 0) {
        const cashProportion = cashPayments / totalPayments;
        const cashInvoiceAmount =
          parseFloat(invoice.total.toString()) * cashProportion;
        totalCashInvoiced += cashInvoiceAmount;
        countInvoicesWithCash++;
      }
    }

    return {
      totalCashInvoiced: parseFloat(totalCashInvoiced.toFixed(2)),
      count: countInvoicesWithCash,
    };
  }

  private async getPosWalkInSales(
    tenantId: number,
    monthStart: Date,
    monthEnd: Date,
  ): Promise<PosWalkInSalesDto> {
    // Obtener folios sin reserva (walk-ins / ventas directas del POS)
    // con sus pagos del período especificado
    const result = await this.folioRepository
      .createQueryBuilder('folio')
      .select('SUM(folio.total)', 'totalPosIncome')
      .addSelect('COUNT(folio.id)', 'transactionCount')
      .leftJoin('folio.payments', 'payment')
      .where('folio.tenantId = :tenantId', { tenantId })
      .andWhere('folio.reservationId IS NULL')
      .andWhere('folio.createdAt BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .andWhere('payment.paymentDate BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .getRawOne();

    return {
      totalPosIncome: parseFloat(result?.totalPosIncome || '0'),
      transactionCount: parseInt(result?.transactionCount || '0', 10),
    };
  }

  private async getRecentReservations(
    tenantId: number,
    status: ReservationStatus,
    limit: number,
  ): Promise<RecentReservationDto[]> {
    // Ordenar por checkInTime para CHECKED_IN y por checkOutTime para CHECKED_OUT
    const orderByField =
      status === ReservationStatus.CHECKED_IN
        ? 'reservation.checkInTime'
        : 'reservation.checkOutTime';

    const reservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.guest', 'guest')
      .leftJoinAndSelect('reservation.room', 'room')
      .leftJoinAndSelect('reservation.roomType', 'roomType')
      .where('reservation.tenantId = :tenantId', { tenantId })
      .andWhere('reservation.status = :status', { status })
      .orderBy(orderByField, 'DESC')
      .take(limit)
      .getMany();

    return reservations.map((reservation) => ({
      publicId: reservation.publicId,
      reservationCode: reservation.reservationCode,
      roomNumber: reservation.room?.roomNumber || null,
      roomTypeName: reservation.roomType.name,
      checkInTime: reservation.checkInTime,
      checkOutTime: reservation.checkOutTime,
      guest: {
        firstName: reservation.guest.firstName,
        lastName: reservation.guest.lastName,
        documentNumber: reservation.guest.documentNumber,
        phone: reservation.guest.phone,
      },
    }));
  }
}
