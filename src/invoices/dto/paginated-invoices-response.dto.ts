import { ApiProperty } from '@nestjs/swagger';
import { InvoiceListItemDto } from './invoice-list-item.dto';

class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items', example: 50 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;
}

export class PaginatedInvoicesResponseDto {
  @ApiProperty({
    description: 'List of invoices',
    type: [InvoiceListItemDto],
  })
  data: InvoiceListItemDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
