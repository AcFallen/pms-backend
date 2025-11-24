import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger(NotificationsCron.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Ejecutar todos los días a las 00:00 (medianoche)
   * Elimina notificaciones con más de 7 días
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldNotifications() {
    this.logger.log('Starting cleanup of old notifications...');

    try {
      const deleted = await this.notificationsService.deleteOldNotifications();

      this.logger.log(
        `Cleanup completed. Deleted ${deleted} notification(s) older than 7 days.`,
      );
    } catch (error) {
      this.logger.error('Error during notification cleanup:', error);
    }
  }
}
