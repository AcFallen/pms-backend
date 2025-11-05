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
import { ChargeType } from '../enums/charge-type.enum';

export class CreateFolioChargeDto {
  @ApiProperty({
    description: 'Folio ID associated with this charge',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  folioId: number;

  @ApiProperty({
    description: 'Type of charge',
    enum: ChargeType,
    example: ChargeType.ROOM,
  })
  @IsEnum(ChargeType)
  @IsNotEmpty()
  chargeType: ChargeType;

  @ApiProperty({
    description: 'Product ID (optional, for product-related charges)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  productId?: number;

  @ApiProperty({
    description: 'Description of the charge',
    example: 'Room 101 - Standard Double',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({
    description: 'Quantity of items/services',
    example: 2.0,
    default: 1,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    description: 'Unit price per item/service',
    example: 50.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  unitPrice: number;

  @ApiProperty({
    description: 'Total amount (quantity * unitPrice)',
    example: 100.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  total: number;

  @ApiProperty({
    description: 'Date when the charge was applied',
    example: '2025-11-05T12:00:00Z',
    required: false,
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  chargeDate?: Date;
}
