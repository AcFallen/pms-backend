import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationStatus } from './enums/notification-status.enum';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Método genérico para crear una notificación
   */
  async create(
    tenantId: number,
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      tenantId,
      userId,
      type,
      title,
      message,
      metadata: metadata || null,
      status: NotificationStatus.UNREAD,
      readAt: null,
    });

    return await this.notificationRepository.save(notification);
  }

  /**
   * Notificación de checkout: envía a todos los HOUSEKEEPER del tenant
   */
  async notifyCheckout(
    tenantId: number,
    reservation: {
      publicId: string;
      reservationCode: string;
      roomNumber: string;
      guestName: string;
      checkOutTime: Date;
    },
  ): Promise<Notification[]> {
    // Obtener todos los usuarios con rol HOUSEKEEPER del tenant que estén activos
    const housekeepers = await this.userRepository.find({
      where: {
        tenantId,
        role: UserRole.HOUSEKEEPER,
        isActive: true,
      },
    });

    if (housekeepers.length === 0) {
      this.logger.warn(
        `No active housekeepers found for tenant ${tenantId}. Notification not sent.`,
      );
      return [];
    }

    const title = `Habitación ${reservation.roomNumber} lista para limpieza`;
    const message = `Check-out completado. Por favor, proceda con la limpieza.`;

    const metadata = {
      reservationPublicId: reservation.publicId,
      reservationCode: reservation.reservationCode,
      roomNumber: reservation.roomNumber,
      guestName: reservation.guestName,
      checkOutTime: reservation.checkOutTime.toISOString(),
    };

    // Crear notificación para cada housekeeper
    const notifications = await Promise.all(
      housekeepers.map((housekeeper) =>
        this.create(
          tenantId,
          housekeeper.id,
          NotificationType.CHECKOUT_CLEANING,
          title,
          message,
          metadata,
        ),
      ),
    );

    this.logger.log(
      `Created ${notifications.length} checkout notifications for tenant ${tenantId}, room ${reservation.roomNumber}`,
    );

    return notifications;
  }

  /**
   * Obtener notificaciones de un usuario (con filtro opcional de estado)
   */
  async findByUser(
    userId: number,
    tenantId: number,
    status?: NotificationStatus,
  ): Promise<Notification[]> {
    const where: any = { userId, tenantId };

    if (status) {
      where.status = status;
    }

    return await this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Contar notificaciones no leídas de un usuario
   */
  async countUnread(userId: number, tenantId: number): Promise<number> {
    return await this.notificationRepository.count({
      where: {
        userId,
        tenantId,
        status: NotificationStatus.UNREAD,
      },
    });
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(
    publicId: string,
    userId: number,
    tenantId: number,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${publicId} not found`,
      );
    }

    // Verificar que la notificación pertenece al usuario
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this notification',
      );
    }

    // Si ya está leída, no hacer nada
    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();

    return await this.notificationRepository.save(notification);
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: number, tenantId: number): Promise<number> {
    const result = await this.notificationRepository.update(
      {
        userId,
        tenantId,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    return result.affected || 0;
  }

  /**
   * Eliminar notificaciones antiguas (más de 7 días)
   * Usado por el CRON job
   */
  async deleteOldNotifications(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.notificationRepository.delete({
      createdAt: LessThan(sevenDaysAgo),
    });

    return result.affected || 0;
  }
}
