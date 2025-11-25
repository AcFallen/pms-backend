import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningTasksService } from './cleaning-tasks.service';
import { CleaningTasksController } from './cleaning-tasks.controller';
import { CleaningTask } from './entities/cleaning-task.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Room } from '../rooms/entities/room.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CleaningTask, Room, User]),
    NotificationsModule,
  ],
  controllers: [CleaningTasksController],
  providers: [CleaningTasksService],
  exports: [CleaningTasksService],
})
export class CleaningTasksModule {}
