import { Guest } from '../entities/guest.entity';

export interface PaginatedGuests {
  data: Guest[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
