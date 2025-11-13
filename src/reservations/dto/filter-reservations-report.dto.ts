import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterReservationsReportDto {
  @ApiProperty({
    description:
      'Start date for filtering reservations by check-in date (ISO 8601 format)',
    example: '2025-01-01',
    required: true,
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description:
      'End date for filtering reservations by check-in date (ISO 8601 format)',
    example: '2025-01-31',
    required: true,
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description:
      'Include charges in the report (optional, not implemented yet)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeCharges?: boolean;
}
