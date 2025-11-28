import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from './auth.service';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Limpia tokens expirados y revocados todos los días a medianoche (00:00)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens() {
    this.logger.log('Starting cleanup of expired refresh tokens...');

    try {
      const deletedCount = await this.authService.cleanupExpiredTokens();
      this.logger.log(`Cleanup completed. Deleted ${deletedCount} expired/revoked tokens.`);
    } catch (error) {
      this.logger.error('Error during token cleanup:', error);
    }
  }
}
