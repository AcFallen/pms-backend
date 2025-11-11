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
} from './dto/dashboard-metrics.dto';

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

  async getMetrics(tenantId: number): Promise<DashboardMetricsDto> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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

    return {
      checkInsToday,
      incomeByPaymentMethod,
      sunatComparison,
      incomeByRoomType,
      documentsGenerated,
      cashInvoices,
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
    // Total de ingresos del mes (pagos)
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

    // Ingresos declarados a SUNAT: pagos que tienen invoice asociada (a través del folio)
    const declaredResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .innerJoin('payment.folio', 'folio')
      .innerJoin('folio.invoices', 'invoice')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.paymentDate BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .andWhere('invoice.id IS NOT NULL')
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
    // Obtener folios con facturas aceptadas en el mes
    const result = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select('SUM(payment.amount)', 'totalCashInvoiced')
      .addSelect('COUNT(DISTINCT invoice.id)', 'count')
      .leftJoin('invoice.folio', 'folio')
      .leftJoin('folio.payments', 'payment')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.createdAt BETWEEN :monthStart AND :monthEnd', {
        monthStart,
        monthEnd,
      })
      .andWhere('invoice.status = :status', { status: InvoiceStatus.ACCEPTED })
      .andWhere('payment.paymentMethod = :paymentMethod', {
        paymentMethod: PaymentMethod.CASH,
      })
      .getRawOne();

    return {
      totalCashInvoiced: parseFloat(result?.totalCashInvoiced || '0'),
      count: parseInt(result?.count || '0', 10),
    };
  }
}
