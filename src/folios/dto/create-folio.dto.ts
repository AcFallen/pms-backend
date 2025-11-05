import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { FolioStatus } from '../enums/folio-status.enum';

export class CreateFolioDto {
  @ApiProperty({
    description: 'Reservation ID associated with this folio',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  reservationId: number;

  @ApiProperty({
    description: 'Unique folio number',
    example: 'FOL-2025-00001',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  folioNumber: string;

  @ApiProperty({
    description: 'Status of the folio',
    enum: FolioStatus,
    default: FolioStatus.OPEN,
    required: false,
  })
  @IsEnum(FolioStatus)
  @IsOptional()
  status?: FolioStatus;

  @ApiProperty({
    description: 'Subtotal amount before tax',
    example: 100.0,
    default: 0,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  subtotal?: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 18.0,
    default: 0,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  tax?: number;

  @ApiProperty({
    description: 'Total amount (subtotal + tax)',
    example: 118.0,
    default: 0,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  total?: number;

  @ApiProperty({
    description: 'Pending balance',
    example: 118.0,
    default: 0,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  balance?: number;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Customer requested late checkout',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
