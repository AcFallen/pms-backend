import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { ChargeType } from '../../folio-charges/enums/charge-type.enum';
import { PaymentMethod } from '../../payments/enums/payment-method.enum';

export class CreateWalkInSaleDto {
  @ApiProperty({
    description: 'Type of charge (PRODUCT, SERVICE, etc.)',
    enum: ChargeType,
    example: ChargeType.PRODUCT,
  })
  @IsEnum(ChargeType)
  @IsNotEmpty()
  chargeType: ChargeType;

  @ApiProperty({
    description: 'Product public ID (UUID) if charge type is PRODUCT',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsString()
  productPublicId?: string;

  @ApiProperty({
    description: 'Description of the item/service',
    example: 'Coca-Cola 500ml',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @ApiProperty({
    description: 'Unit price (including IGV/tax)',
    example: 3.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitPrice: number;

  @ApiProperty({
    description: 'Payment method (CASH, CARD, TRANSFER, YAPE, PLIN)',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;


  @ApiProperty({
    description: 'Optional notes for the folio',
    example: 'Walk-in sale - paid in cash',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
