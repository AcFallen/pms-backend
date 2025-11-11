import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashierSessionDto {
  @ApiProperty({
    description: 'Actual counted amount in cash when closing',
    example: 1195.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  countedAmount: number;

  @ApiProperty({
    description: 'Notes for closing the cashier session',
    example: 'Closing with difference of -5 soles',
    required: false,
  })
  @IsString()
  @IsOptional()
  closingNotes?: string;
}
