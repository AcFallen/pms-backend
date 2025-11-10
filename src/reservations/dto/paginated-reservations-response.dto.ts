import { ApiProperty } from '@nestjs/swagger';
import { ReservationListItemDto } from './reservation-list-item.dto';

export class PaginatedReservationsResponseDto {
  @ApiProperty({
    description: 'Array of reservations for the current page',
    type: [ReservationListItemDto],
  })
  data: ReservationListItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 50,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
