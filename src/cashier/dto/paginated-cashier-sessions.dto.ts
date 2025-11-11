import { ApiProperty } from '@nestjs/swagger';
import { CashierSessionListItemDto } from './cashier-session-list-item.dto';

class PaginationMeta {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PaginatedCashierSessionsDto {
  @ApiProperty({ type: [CashierSessionListItemDto] })
  data: CashierSessionListItemDto[];

  @ApiProperty()
  meta: PaginationMeta;
}
