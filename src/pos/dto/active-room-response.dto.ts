import { ApiProperty } from '@nestjs/swagger';

export class ActiveRoomResponseDto {
  @ApiProperty({
    description: 'Room number',
    example: '101',
  })
  roomNumber: string;

  @ApiProperty({
    description: 'Room type name',
    example: 'Deluxe Suite',
  })
  roomType: string;

  @ApiProperty({
    description: 'Reservation public ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  reservationPublicId: string;

  @ApiProperty({
    description: 'Reservation code',
    example: 'RES-20250111-0001',
  })
  reservationCode: string;

  @ApiProperty({
    description: 'Guest full name',
    example: 'John Doe',
  })
  guestName: string;

  @ApiProperty({
    description: 'Check-in date',
    example: '2025-01-10T14:00:00.000Z',
  })
  checkInDate: Date;

  @ApiProperty({
    description: 'Check-out date',
    example: '2025-01-15T12:00:00.000Z',
  })
  checkOutDate: Date;

  @ApiProperty({
    description: 'Folio public ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  folioPublicId: string;

  @ApiProperty({
    description: 'Folio number',
    example: 'F-20250110-0001',
  })
  folioNumber: string;

  @ApiProperty({
    description: 'Current folio balance',
    example: 450.5,
  })
  folioBalance: number;
}
