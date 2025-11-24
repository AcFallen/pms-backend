import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Notification } from './entities/notification.entity';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@WebSocketGateway({
  cors: {
    origin: '*', // Ajustar según tus necesidades de CORS
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth or authorization header
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.error(
          `Client ${client.id} connection rejected: No token provided`,
        );
        client.disconnect();
        return;
      }

      // Verify and decode JWT using NestJS JwtService
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (!payload.sub || !payload.tenantId) {
        this.logger.error(
          `Client ${client.id} connection rejected: Invalid token payload`,
        );
        client.disconnect();
        return;
      }

      // Store user data in socket for later use
      client.data.userId = payload.sub; // Internal numeric ID
      client.data.publicId = payload.publicId; // UUID
      client.data.tenantId = payload.tenantId;
      client.data.role = payload.role;
      client.data.email = payload.email;

      this.logger.log(
        `✅ Client ${client.id} connected - User: ${payload.email} (ID: ${payload.sub}, Tenant: ${payload.tenantId})`,
      );
    } catch (error) {
      this.logger.error(
        `Client ${client.id} connection rejected: ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Cliente se une a su sala personal
   * Ya no necesita payload - usa los datos del JWT del socket
   */
  @SubscribeMessage('join')
  async handleJoin(
    client: Socket,
  ): Promise<{ success: boolean; message: string; userId?: number; publicId?: string }> {
    try {
      // Get user data from JWT stored in socket.data during connection
      const userId = client.data.userId;
      const publicId = client.data.publicId;
      const tenantId = client.data.tenantId;

      if (!userId || !tenantId) {
        this.logger.error(`Client ${client.id} join failed: Missing user data in socket`);
        return {
          success: false,
          message: 'Authentication required',
        };
      }

      const room = `user:${userId}`;
      client.join(room);

      this.logger.log(
        `✅ Client ${client.id} joined room ${room} (publicId: ${publicId}, tenant: ${tenantId})`,
      );

      return {
        success: true,
        message: `Successfully joined room ${room}`,
        userId,
        publicId,
      };
    } catch (error) {
      this.logger.error(`Client ${client.id} join error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to join room',
      };
    }
  }

  /**
   * Emitir notificación a un usuario específico en tiempo real
   * Se llama desde el servicio después de crear la notificación
   */
  emitToUser(userId: number, notification: Notification): void {
    const room = `user:${userId}`;
    this.server.to(room).emit('notification', notification);

    this.logger.log(
      `Notification ${notification.publicId} emitted to user ${userId}`,
    );
  }
}
