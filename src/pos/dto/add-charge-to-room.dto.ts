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

export class AddChargeToRoomDto {
  @ApiProperty({
    description: 'Public ID (UUID) of the reservation',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  reservationPublicId: string;

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
    example: 'Room service - Wine bottle',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Quantity',
    example: 1,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity: number;

  @ApiProperty({
    description: 'Unit price (including IGV)',
    example: 50.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  unitPrice: number;

  @ApiProperty({
    description: 'Optional notes for the charge',
    example: 'Requested by guest via phone',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
