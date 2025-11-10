import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatus } from '../enums/reservation-status.enum';

export class FilterReservationsDto {
  @ApiProperty({
    description: 'Page number (starts at 1)',
    example: 1,
    minimum: 1,
    required: false,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    required: false,
    default: 10,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by check-in date (exact match, ISO 8601 format: YYYY-MM-DD)',
    example: '2025-11-10',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  checkInDate?: string;

  @ApiProperty({
    description: 'Filter by check-in date range - start date (ISO 8601 format: YYYY-MM-DD)',
    example: '2025-11-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  checkInStartDate?: string;

  @ApiProperty({
    description: 'Filter by check-in date range - end date (ISO 8601 format: YYYY-MM-DD)',
    example: '2025-11-30',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  checkInEndDate?: string;

  @ApiProperty({
    description: 'Filter by reservation status',
    enum: ReservationStatus,
    example: ReservationStatus.CHECKED_IN,
    required: false,
  })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @ApiProperty({
    description: 'Search by guest information (name or document number, case-insensitive)',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
}
