import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { ReservationSource } from '../enums/reservation-source.enum';

export class CreateReservationDto {
  @ApiProperty({
    description: 'Guest ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  guestId: number;

  @ApiProperty({
    description: 'Room ID (optional, can be assigned later)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty({
    description: 'Room type ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  roomTypeId: number;

  @ApiProperty({
    description: 'Reservation code (unique)',
    example: 'RES-2025-001',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  reservationCode: string;

  @ApiProperty({
    description: 'Reservation status',
    enum: ReservationStatus,
    example: ReservationStatus.PENDING,
    default: ReservationStatus.PENDING,
    required: false,
  })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;

  @ApiProperty({
    description: 'Reservation source',
    enum: ReservationSource,
    example: ReservationSource.DIRECT,
    default: ReservationSource.DIRECT,
    required: false,
  })
  @IsEnum(ReservationSource)
  @IsOptional()
  source?: ReservationSource;

  @ApiProperty({
    description: 'Check-in date (YYYY-MM-DD)',
    example: '2025-12-20',
  })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({
    description: 'Check-out date (YYYY-MM-DD)',
    example: '2025-12-25',
  })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @ApiProperty({
    description: 'Number of nights',
    example: 5,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  nights: number;

  @ApiProperty({
    description: 'Number of adults',
    example: 2,
    default: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  adults?: number;

  @ApiProperty({
    description: 'Number of children',
    example: 1,
    default: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  children?: number;

  @ApiProperty({
    description: 'Rate per night',
    example: '150.00',
  })
  @IsNotEmpty()
  ratePerNight: string;

  @ApiProperty({
    description: 'Total amount',
    example: '750.00',
  })
  @IsNotEmpty()
  totalAmount: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Cliente solicita habitación con vista al mar',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
