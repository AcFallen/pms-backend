import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  Min,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentToFolioDto {
  @ApiProperty({
    description: 'Public ID (UUID) of the folio to add payment to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  folioPublicId: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Payment amount',
    example: 300.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Reference number (optional, auto-generated if not provided)',
    example: 'PAY-2025-00042',
    maxLength: 100,
    required: false,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({
    description: 'Additional notes about the payment',
    example: 'Additional payment',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
