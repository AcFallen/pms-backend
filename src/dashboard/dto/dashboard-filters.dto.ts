import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class DashboardFiltersDto {
  @ApiProperty({
    description: 'Start date for metrics (YYYY-MM-DD). Defaults to first day of current month',
    example: '2025-11-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for metrics (YYYY-MM-DD). Defaults to last day of current month',
    example: '2025-11-30',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
