import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckoutReservationDto {
  @ApiProperty({
    description: 'Optional notes about the checkout',
    example: 'Guest checked out on time, no issues',
    required: false,
  })
  @IsString()
  @IsOptional()
  checkoutNotes?: string;
}
