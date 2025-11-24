import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { NotificationType } from '../enums/notification-type.enum';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.CHECKOUT_CLEANING,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Habitación lista para limpieza',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'La habitación 101 necesita limpieza. Huésped: Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Additional metadata (flexible JSON)',
    required: false,
    example: {
      reservationPublicId: '550e8400-e29b-41d4-a716-446655440000',
      reservationCode: 'RES-2025-001',
      roomNumber: '101',
      guestName: 'Juan Pérez',
      checkOutTime: '2025-11-24T12:00:00.000Z',
    },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
