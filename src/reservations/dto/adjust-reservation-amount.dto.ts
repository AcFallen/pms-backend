import {
  IsNotEmpty,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustReservationAmountDto {
  @ApiProperty({
    description: 'New total amount for the reservation',
    example: 850.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  newTotalAmount: number;
}
