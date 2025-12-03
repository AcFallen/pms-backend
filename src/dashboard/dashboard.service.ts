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
    // STATIC VALUES FOR DASHBOARD MOCKING
    return {
      checkInsToday: 5,
      incomeByPaymentMethod: [
        { paymentMethod: PaymentMethod.CASH, totalIncome: 2500.0 },
        { paymentMethod: PaymentMethod.CARD, totalIncome: 1800.0 },
        { paymentMethod: PaymentMethod.TRANSFER, totalIncome: 950.0 },
        { paymentMethod: PaymentMethod.YAPE, totalIncome: 450.0 },
        { paymentMethod: PaymentMethod.PLIN, totalIncome: 300.0 },
      ],
      sunatComparison: {
        declaredToSunat: 4200.0,
        notDeclared: 1200.0,
        declarationPercentage: 77.78,
      },
      incomeByRoomType: [
        {
          roomTypePublicId: '550e8400-e29b-41d4-a716-446655440001',
          roomTypeName: 'Suite',
          totalIncome: 2800.0,
        },
        {
          roomTypePublicId: '550e8400-e29b-41d4-a716-446655440002',
          roomTypeName: 'Doble',
          totalIncome: 1950.0,
        },
        {
          roomTypePublicId: '550e8400-e29b-41d4-a716-446655440003',
          roomTypeName: 'Matrimonial',
          totalIncome: 1650.0,
        },
      ],
      documentsGenerated: 12,
      cashInvoices: {
        totalCashInvoiced: 1850.5,
        count: 5,
      },
      posWalkInSales: {
        totalPosIncome: 650.0,
        transactionCount: 18,
      },
      recentCheckIns: [
        {
          publicId: '550e8400-e29b-41d4-a716-446655440100',
          reservationCode: 'RES-2025-001',
          roomNumber: '301',
          roomTypeName: 'Suite',
          checkInTime: new Date('2025-12-03T14:30:00'),
          checkOutTime: null,
          guest: {
            firstName: 'Juan',
            lastName: 'García',
            documentNumber: '12345678',
            phone: '+51987654321',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440101',
          reservationCode: 'RES-2025-002',
          roomNumber: '203',
          roomTypeName: 'Doble',
          checkInTime: new Date('2025-12-03T13:45:00'),
          checkOutTime: null,
          guest: {
            firstName: 'María',
            lastName: 'López',
            documentNumber: '87654321',
            phone: '+51987654322',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440102',
          reservationCode: 'RES-2025-003',
          roomNumber: '105',
          roomTypeName: 'Matrimonial',
          checkInTime: new Date('2025-12-03T11:20:00'),
          checkOutTime: null,
          guest: {
            firstName: 'Carlos',
            lastName: 'Rodríguez',
            documentNumber: '11223344',
            phone: '+51987654323',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440103',
          reservationCode: 'RES-2025-004',
          roomNumber: '204',
          roomTypeName: 'Doble',
          checkInTime: new Date('2025-12-02T15:10:00'),
          checkOutTime: null,
          guest: {
            firstName: 'Ana',
            lastName: 'Martínez',
            documentNumber: '55667788',
            phone: '+51987654324',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440104',
          reservationCode: 'RES-2025-005',
          roomNumber: '302',
          roomTypeName: 'Suite',
          checkInTime: new Date('2025-12-02T12:30:00'),
          checkOutTime: null,
          guest: {
            firstName: 'Pedro',
            lastName: 'Sánchez',
            documentNumber: '99887766',
            phone: '+51987654325',
          },
        },
      ],
      recentCheckOuts: [
        {
          publicId: '550e8400-e29b-41d4-a716-446655440200',
          reservationCode: 'RES-2025-101',
          roomNumber: '401',
          roomTypeName: 'Matrimonial',
          checkInTime: new Date('2025-12-01T16:00:00'),
          checkOutTime: new Date('2025-12-03T10:30:00'),
          guest: {
            firstName: 'Laura',
            lastName: 'Fernández',
            documentNumber: '44556677',
            phone: '+51987654326',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440201',
          reservationCode: 'RES-2025-102',
          roomNumber: '102',
          roomTypeName: 'Doble',
          checkInTime: new Date('2025-12-01T14:15:00'),
          checkOutTime: new Date('2025-12-03T09:45:00'),
          guest: {
            firstName: 'Roberto',
            lastName: 'Torres',
            documentNumber: '22334455',
            phone: '+51987654327',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440202',
          reservationCode: 'RES-2025-103',
          roomNumber: '303',
          roomTypeName: 'Suite',
          checkInTime: new Date('2025-11-30T18:20:00'),
          checkOutTime: new Date('2025-12-03T08:00:00'),
          guest: {
            firstName: 'Sofía',
            lastName: 'Gómez',
            documentNumber: '77889900',
            phone: '+51987654328',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440203',
          reservationCode: 'RES-2025-104',
          roomNumber: '201',
          roomTypeName: 'Doble',
          checkInTime: new Date('2025-11-30T13:45:00'),
          checkOutTime: new Date('2025-12-02T11:15:00'),
          guest: {
            firstName: 'Francisco',
            lastName: 'Diaz',
            documentNumber: '33445566',
            phone: '+51987654329',
          },
        },
        {
          publicId: '550e8400-e29b-41d4-a716-446655440204',
          reservationCode: 'RES-2025-105',
          roomNumber: '402',
          roomTypeName: 'Matrimonial',
          checkInTime: new Date('2025-11-29T17:30:00'),
          checkOutTime: new Date('2025-12-02T10:00:00'),
          guest: {
            firstName: 'Elena',
            lastName: 'Castro',
            documentNumber: '88990011',
            phone: '+51987654330',
          },
        },
      ],
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
      if (!invoice.folio || !invoice.folio.payments || invoice.folio.payments.length === 0) {
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
        .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

      // Si hubo pagos en efectivo, calcular la proporción del monto facturado
      if (cashPayments > 0 && totalPayments > 0) {
        const cashProportion = cashPayments / totalPayments;
        const cashInvoiceAmount = parseFloat(invoice.total.toString()) * cashProportion;
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
