import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Folio ID associated with this payment',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  folioId: number;

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
    example: 150.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Reference number (operation/voucher number)',
    example: 'OP-2025-00123',
    maxLength: 100,
    required: false,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({
    description: 'Date when the payment was made',
    example: '2025-11-05T12:00:00Z',
    required: false,
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  paymentDate?: Date;

  @ApiProperty({
    description: 'Additional notes about the payment',
    example: 'Payment received in full',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
