import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationStatus } from '../enums/notification-status.enum';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification public ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  publicId: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.CHECKOUT_CLEANING,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification status',
    enum: NotificationStatus,
    example: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @ApiProperty({
    description: 'Notification title',
    example: 'Habitación lista para limpieza',
  })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'La habitación 101 necesita limpieza. Huésped: Juan Pérez',
  })
  message: string;

  @ApiProperty({
    description: 'Additional metadata',
    nullable: true,
    example: {
      reservationPublicId: '550e8400-e29b-41d4-a716-446655440000',
      reservationCode: 'RES-2025-001',
      roomNumber: '101',
      guestName: 'Juan Pérez',
      checkOutTime: '2025-11-24T12:00:00.000Z',
    },
  })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-11-24T14:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Read timestamp',
    nullable: true,
    example: '2025-11-24T15:00:00.000Z',
  })
  readAt: Date | null;
}
