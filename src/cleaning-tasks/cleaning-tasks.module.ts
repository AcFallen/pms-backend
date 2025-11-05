import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningTasksService } from './cleaning-tasks.service';
import { CleaningTasksController } from './cleaning-tasks.controller';
import { CleaningTask } from './entities/cleaning-task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CleaningTask])],
  controllers: [CleaningTasksController],
  providers: [CleaningTasksService],
  exports: [CleaningTasksService],
})
export class CleaningTasksModule {}
