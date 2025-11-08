import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCalendarReservationsDto {
  @ApiProperty({
    description: 'Start date for calendar range (ISO 8601 format)',
    example: '2025-11-08',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date for calendar range (ISO 8601 format)',
    example: '2025-11-22',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Filter by room public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  roomPublicId?: string;
}
