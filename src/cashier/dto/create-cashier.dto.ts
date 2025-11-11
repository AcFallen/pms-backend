import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenCashierSessionDto {
  @ApiProperty({
    description: 'Opening amount in cash',
    example: 100.0,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingAmount: number;

  @ApiProperty({
    description: 'Notes for opening the cashier session',
    example: 'Opening with 100 soles',
    required: false,
  })
  @IsString()
  @IsOptional()
  openingNotes?: string;
}
