import { PartialType } from '@nestjs/swagger';
import { CreateVoucherSeriesDto } from './create-voucher-series.dto';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVoucherSeriesDto extends PartialType(
  CreateVoucherSeriesDto,
) {
  @ApiPropertyOptional({
    description:
      'Actualizar el número correlativo actual (usar con precaución)',
    example: 100,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  currentNumber?: number;
}
