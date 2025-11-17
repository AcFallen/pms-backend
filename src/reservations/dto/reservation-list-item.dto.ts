import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '../enums/reservation-status.enum';

export class ReservationListItemDto {
  @ApiProperty({
    description: 'Reservation public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  publicId: string;

  @ApiProperty({
    description: 'Reservation code',
    example: 'RES-2025-00001',
  })
  reservationCode: string;

  @ApiProperty({
    description: 'Guest full name (first name + last name)',
    example: 'John Doe',
  })
  guestFullName: string;

  @ApiProperty({
    description: 'Guest document number',
    example: '12345678',
  })
  guestDocument: string;

  @ApiProperty({
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2025-11-10',
  })
  checkInDate: string;

  @ApiProperty({
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2025-11-12',
  })
  checkOutDate: string;

  @ApiProperty({
    description: 'Room number',
    example: '101',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'Number of nights',
    example: 2,
  })
  nights: number;

  @ApiProperty({
    description: 'Number of hours (for hourly rentals)',
    example: 0,
    nullable: true,
  })
  hours: number | null;

  @ApiProperty({
    description: 'Total amount',
    example: 500.0,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Reservation status',
    enum: ReservationStatus,
    example: ReservationStatus.CHECKED_IN,
  })
  status: ReservationStatus;

  @ApiProperty({
    description: 'Creation date',
    example: '2025-11-08T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Indicates if an invoice has been issued for this reservation',
    example: true,
  })
  hasInvoice: boolean;

  @ApiProperty({
    description:
      'Payment methods used for this reservation as an array. Empty array if no payments.',
    example: ['cash', 'yape'],
    type: [String],
  })
  paymentMethods: string[];

  @ApiProperty({
    description: 'Folio balance (amount owed by the guest)',
    example: 150.5,
    nullable: true,
  })
  folioBalance: number | null;

  @ApiProperty({
    description: 'Folio status (open or closed)',
    example: 'open',
    nullable: true,
  })
  folioStatus: string | null;

  @ApiProperty({
    description: 'Check-in time (timestamp)',
    example: '2025-11-10T14:00:00Z',
    nullable: true,
  })
  checkInTime: Date | null;

  @ApiProperty({
    description: 'Check-out time (timestamp)',
    example: '2025-11-12T12:00:00Z',
    nullable: true,
  })
  checkOutTime: Date | null;
}
