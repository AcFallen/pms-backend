import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../payments/enums/payment-method.enum';

export class PaymentMethodIncomeDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Total income for this payment method',
    example: 1500.0,
  })
  totalIncome: number;
}

export class RoomTypeIncomeDto {
  @ApiProperty({
    description: 'Room type public ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  roomTypePublicId: string;

  @ApiProperty({
    description: 'Room type name',
    example: 'Suite Matrimonial',
  })
  roomTypeName: string;

  @ApiProperty({
    description: 'Total income for this room type',
    example: 2500.0,
  })
  totalIncome: number;
}

export class IncomeSunatComparisonDto {
  @ApiProperty({
    description: 'Total income declared to SUNAT (invoices generated)',
    example: 5000.0,
  })
  declaredToSunat: number;

  @ApiProperty({
    description: 'Total income not declared to SUNAT (no invoices)',
    example: 1500.0,
  })
  notDeclared: number;

  @ApiProperty({
    description: 'Percentage of income declared to SUNAT',
    example: 76.92,
  })
  declarationPercentage: number;
}

export class CashInvoicesDto {
  @ApiProperty({
    description:
      'Total amount from invoices declared to SUNAT but paid in cash',
    example: 800.0,
  })
  totalCashInvoiced: number;

  @ApiProperty({
    description: 'Count of invoices paid in cash',
    example: 5,
  })
  count: number;
}

export class DashboardMetricsDto {
  @ApiProperty({
    description: 'Number of check-ins today',
    example: 8,
  })
  checkInsToday: number;

  @ApiProperty({
    description: 'Income breakdown by payment method (current month)',
    type: [PaymentMethodIncomeDto],
  })
  incomeByPaymentMethod: PaymentMethodIncomeDto[];

  @ApiProperty({
    description: 'Comparison of declared vs non-declared income (current month)',
    type: IncomeSunatComparisonDto,
  })
  sunatComparison: IncomeSunatComparisonDto;

  @ApiProperty({
    description: 'Income breakdown by room type (current month)',
    type: [RoomTypeIncomeDto],
  })
  incomeByRoomType: RoomTypeIncomeDto[];

  @ApiProperty({
    description: 'Number of documents (invoices) generated this month',
    example: 45,
  })
  documentsGenerated: number;

  @ApiProperty({
    description:
      'Invoices declared to SUNAT but paid in cash (current month)',
    type: CashInvoicesDto,
  })
  cashInvoices: CashInvoicesDto;
}
