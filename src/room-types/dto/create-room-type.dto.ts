import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsDecimal,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomTypeDto {
  @ApiProperty({
    description: 'Room type name',
    example: 'Matrimonial',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Room type description',
    example: 'Habitación con cama matrimonial, vista al mar',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Maximum occupancy',
    example: 2,
    default: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxOccupancy?: number;

  @ApiProperty({
    description: 'Base price per night',
    example: '150.00',
    type: String,
  })
  @IsNotEmpty()
  @IsDecimal({ decimal_digits: '2' })
  basePrice: string;

  @ApiProperty({
    description: 'Is room type active',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
