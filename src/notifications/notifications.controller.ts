import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { NotificationStatus } from './enums/notification-status.enum';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: NotificationStatus,
    description: 'Filter by notification status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of notifications',
    type: [NotificationResponseDto],
  })
  async findMyNotifications(
    @CurrentUser() user: CurrentUserData,
    @Query('status') status?: NotificationStatus,
  ) {
    return await this.notificationsService.findByUser(
      user.userId,
      user.tenantId,
      status,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  async getUnreadCount(@CurrentUser() user: CurrentUserData) {
    const count = await this.notificationsService.countUnread(
      user.userId,
      user.tenantId,
    );
    return { count };
  }

  @Patch(':publicId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Notification public ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - notification belongs to another user',
  })
  async markAsRead(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.notificationsService.markAsRead(
      publicId,
      user.userId,
      user.tenantId,
    );
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', example: 10 },
      },
    },
  })
  async markAllAsRead(@CurrentUser() user: CurrentUserData) {
    const updated = await this.notificationsService.markAllAsRead(
      user.userId,
      user.tenantId,
    );
    return { updated };
  }
}
