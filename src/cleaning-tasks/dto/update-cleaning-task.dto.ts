import { PartialType } from '@nestjs/swagger';
import { CreateCleaningTaskDto } from './create-cleaning-task.dto';

export class UpdateCleaningTaskDto extends PartialType(CreateCleaningTaskDto) {}
