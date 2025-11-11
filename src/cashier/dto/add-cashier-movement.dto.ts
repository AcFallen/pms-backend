import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { CashierMovementType } from '../entities/cashier-movement.entity';

export class AddCashierMovementDto {
  @ApiProperty({
    description: 'Type of movement',
    enum: CashierMovementType,
    example: CashierMovementType.CASH_OUT,
  })
  @IsEnum(CashierMovementType)
  type: CashierMovementType;

  @ApiProperty({
    description: 'Amount of the movement',
    example: 50.0,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Reason for the movement',
    example: 'Compra de suministros de limpieza',
  })
  @IsString()
  reason: string;
}
