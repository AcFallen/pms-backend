import { ApiProperty } from '@nestjs/swagger';
import { CashierSessionStatus } from '../entities/cashier.entity';

export class CashierSessionListItemDto {
  @ApiProperty()
  publicId: string;

  @ApiProperty()
  status: CashierSessionStatus;

  @ApiProperty()
  openingAmount: number;

  @ApiProperty({ nullable: true })
  expectedAmount: number | null;

  @ApiProperty({ nullable: true })
  countedAmount: number | null;

  @ApiProperty({ nullable: true })
  difference: number | null;

  @ApiProperty()
  openedAt: Date;

  @ApiProperty({ nullable: true })
  closedAt: Date | null;

  @ApiProperty({ description: 'User who opened the session' })
  openedByUser: {
    publicId: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({ description: 'User who closed the session', nullable: true })
  closedByUser: {
    publicId: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}
