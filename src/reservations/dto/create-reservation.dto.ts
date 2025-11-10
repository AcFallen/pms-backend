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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { ReservationSource } from '../enums/reservation-source.enum';

export class CreateReservationDto {
  @ApiProperty({
    description: 'Guest public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  guestPublicId: string;

  @ApiProperty({
    description: 'Room public UUID (optional, can be assigned later)',
    example: '0e4c47ba-b3fc-49b6-ae41-a174334bb525',
    required: false,
  })
  @IsString()
  @IsOptional()
  roomPublicId?: string;

  @ApiProperty({
    description: 'Room type public UUID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsString()
  @IsNotEmpty()
  roomTypePublicId: string;

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

  @ApiPropertyOptional({
    description:
      'Number of nights (opcional, se puede calcular automáticamente)',
    example: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  nights?: number;

  @ApiPropertyOptional({
    description: 'Number of hours (opcional, solo si el hotel cobra por hora)',
    example: 3,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  hours?: number;

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

  @ApiPropertyOptional({
    description:
      'Tarifa aplicada (opcional, puede venir del precio de la habitación o configuración del tenant)',
    example: '150.00',
  })
  @IsOptional()
  appliedRate?: string;

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
