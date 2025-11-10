import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../payments/enums/payment-method.enum';

export class FolioPaymentDto {
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
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Payment reference number (optional)',
    example: 'OP-2025-00123',
    required: false,
  })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({
    description: 'Payment notes (optional)',
    example: 'Initial payment',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateFolioWithPaymentDto {
  @ApiProperty({
    description: 'Reservation public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  reservationPublicId: string;

  @ApiProperty({
    description: 'Folio notes (optional)',
    example: 'Walk-in folio',
    required: false,
  })
  @IsString()
  @IsOptional()
  folioNotes?: string;

  @ApiProperty({
    description: 'Payment information',
    type: FolioPaymentDto,
  })
  @ValidateNested()
  @Type(() => FolioPaymentDto)
  @IsNotEmpty()
  payment: FolioPaymentDto;
}
