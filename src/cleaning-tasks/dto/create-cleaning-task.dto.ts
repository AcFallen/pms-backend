import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskType } from '../enums/task-type.enum';

export class CreateCleaningTaskDto {
  @ApiProperty({
    description: 'Room ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  roomId: number;

  @ApiProperty({
    description: 'User ID assigned to the task (housekeeper)',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  assignedTo?: number;

  @ApiProperty({
    description: 'Task status',
    enum: TaskStatus,
    example: TaskStatus.PENDING,
    default: TaskStatus.PENDING,
    required: false,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({
    description: 'Task priority',
    enum: TaskPriority,
    example: TaskPriority.NORMAL,
    default: TaskPriority.NORMAL,
    required: false,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Task type',
    enum: TaskType,
    example: TaskType.CHECKOUT,
    default: TaskType.CHECKOUT,
    required: false,
  })
  @IsEnum(TaskType)
  @IsOptional()
  taskType?: TaskType;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Limpieza profunda requerida, huésped derramó vino',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
