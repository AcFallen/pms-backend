import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../payments/enums/payment-method.enum';

export class AddPaymentToFolioDto {
  @ApiProperty({
    description: 'Folio public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  folioPublicId: string;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Amount paid',
    example: 150.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Payment reference number (optional, auto-generated if not provided)',
    example: 'PAY-2025-00123',
    required: false,
  })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({
    description: 'Payment notes (optional)',
    example: 'Partial payment',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
