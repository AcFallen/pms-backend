import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRateDto {
  @ApiProperty({
    description: 'Room type public ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  roomTypePublicId: string;

  @ApiProperty({
    description: 'Rate name',
    example: 'Tarifa Fin de Semana',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Price per night',
    example: '150.00',
  })
  @IsNotEmpty()
  price: string;

  @ApiProperty({
    description: 'Start date (YYYY-MM-DD)',
    example: '2025-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD)',
    example: '2025-12-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Days of week (comma-separated numbers 0-6, where 0=Sunday)',
    example: '1,2,3,4,5',
    maxLength: 20,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  @Matches(/^[0-6](,[0-6])*$/, {
    message: 'daysOfWeek must be comma-separated numbers between 0-6',
  })
  daysOfWeek?: string;

  @ApiProperty({
    description: 'Priority (higher number = higher priority)',
    example: 10,
    default: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @ApiProperty({
    description: 'Is rate active',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
