import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not as NotEqual } from 'typeorm';
import { CreateCleaningTaskDto } from './dto/create-cleaning-task.dto';
import { CleaningTask } from './entities/cleaning-task.entity';
import { TaskStatus } from './enums/task-status.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';
import { CleaningStatus } from '../rooms/enums/cleaning-status.enum';
import { RoomStatus } from '../rooms/enums/room-status.enum';

@Injectable()
export class CleaningTasksService {
  constructor(
    @InjectRepository(CleaningTask)
    private readonly cleaningTaskRepository: Repository<CleaningTask>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    createCleaningTaskDto: CreateCleaningTaskDto,
    tenantId: number,
  ): Promise<CleaningTask> {
    const cleaningTask = this.cleaningTaskRepository.create({
      ...createCleaningTaskDto,
      tenantId,
    });
    return await this.cleaningTaskRepository.save(cleaningTask);
  }

  async findAll(tenantId: number): Promise<CleaningTask[]> {
    return await this.cleaningTaskRepository.find({
      where: { tenantId, status: NotEqual(TaskStatus.COMPLETED) },
      relations: ['room', 'assignedUser'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number, tenantId: number): Promise<CleaningTask> {
    const cleaningTask = await this.cleaningTaskRepository.findOne({
      where: { id, tenantId },
      relations: ['room', 'assignedUser'],
    });
    if (!cleaningTask) {
      throw new NotFoundException(`Cleaning task with ID ${id} not found`);
    }
    return cleaningTask;
  }

  async findByPublicId(
    publicId: string,
    tenantId: number,
  ): Promise<CleaningTask> {
    const cleaningTask = await this.cleaningTaskRepository.findOne({
      where: { publicId, tenantId },
      relations: ['room', 'assignedUser'],
    });
    if (!cleaningTask) {
      throw new NotFoundException(
        `Cleaning task with public ID ${publicId} not found`,
      );
    }
    return cleaningTask;
  }

  /**
   * Start maintenance on a cleaning task
   * Sets status to IN_PROGRESS and auto-assigns to current user
   */
  async startMaintenance(
    publicId: string,
    userId: number,
    tenantId: number,
  ): Promise<CleaningTask> {
    const cleaningTask = await this.findByPublicId(publicId, tenantId);

    // Update task status and assign to current user
    cleaningTask.status = TaskStatus.IN_PROGRESS;
    cleaningTask.assignedTo = userId;
    cleaningTask.startedAt = new Date();

    const savedTask = await this.cleaningTaskRepository.save(cleaningTask);

    // Update room status to MAINTENANCE
    const room = await this.roomRepository.findOne({
      where: { id: cleaningTask.roomId },
    });

    if (room) {
      room.status = RoomStatus.MAINTENANCE;
      await this.roomRepository.save(room);
    }

    return savedTask;
  }

  /**
   * Mark cleaning task as clean/completed
   */
  async markAsClean(publicId: string, tenantId: number): Promise<CleaningTask> {
    const cleaningTask = await this.findByPublicId(publicId, tenantId);

    // Update task status to completed
    cleaningTask.status = TaskStatus.COMPLETED;
    cleaningTask.completedAt = new Date();

    const savedTask = await this.cleaningTaskRepository.save(cleaningTask);

    // Get room information for notification and update cleaning status
    const room = await this.roomRepository.findOne({
      where: { id: cleaningTask.roomId },
    });

    if (!room) {
      throw new NotFoundException(
        `Room with ID ${cleaningTask.roomId} not found`,
      );
    }

    // Update room cleaning status to CLEAN and status to AVAILABLE
    // Only change status to AVAILABLE if it's currently MAINTENANCE or OCCUPIED
    // Don't change if it's BLOCKED (manual block by admin)
    if (
      room.status === RoomStatus.MAINTENANCE ||
      room.status === RoomStatus.OCCUPIED
    ) {
      room.status = RoomStatus.AVAILABLE;
    }
    room.cleaningStatus = CleaningStatus.CLEAN;
    await this.roomRepository.save(room);

    // Get user information (who cleaned the room)
    let cleanedBy = 'Personal de limpieza';
    if (cleaningTask.assignedTo) {
      const user = await this.userRepository.findOne({
        where: { id: cleaningTask.assignedTo },
        select: ['firstName', 'lastName', 'email'],
      });
      if (user) {
        cleanedBy = `${user.firstName} ${user.lastName}`.trim() || user.email;
      }
    }

    // Create notifications for MANAGER and RECEPTIONIST
    const notifications = await this.notificationsService.notifyRoomCleaned(
      tenantId,
      {
        publicId: room.publicId,
        roomNumber: room.roomNumber,
        cleanedBy,
        cleanedAt: cleaningTask.completedAt,
      },
    );

    // Emit notifications via WebSocket to each user
    for (const notification of notifications) {
      this.notificationsGateway.emitToUser(notification.userId, notification);
    }

    return savedTask;
  }
}
