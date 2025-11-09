import { ApiProperty } from '@nestjs/swagger';

export class CalendarReservationResponseDto {
  @ApiProperty({
    description: 'Reservation public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  publicId: string;

  @ApiProperty({
    description: 'Room public UUID',
    example: '0e4c47ba-b3fc-49b6-ae41-a174334bb525',
    nullable: true,
  })
  publicRoomId: string | null;

  @ApiProperty({
    description: 'Guest full name (firstName + lastName)',
    example: 'Juan Pérez',
  })
  guestName: string;

  @ApiProperty({
    description: 'Check-in date',
    example: '2025-11-08',
    type: String,
  })
  checkIn: string;

  @ApiProperty({
    description: 'Check-out date',
    example: '2025-11-11',
    type: String,
  })
  checkOut: string;
}
