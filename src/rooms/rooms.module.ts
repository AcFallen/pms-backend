import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { Room } from './entities/room.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { CleaningStatus } from './enums/cleaning-status.enum';
import { CleaningTask } from 'src/cleaning-tasks/entities/cleaning-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomType , CleaningTask])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
