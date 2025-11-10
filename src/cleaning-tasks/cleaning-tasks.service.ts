import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCleaningTaskDto } from './dto/create-cleaning-task.dto';
import { UpdateCleaningTaskDto } from './dto/update-cleaning-task.dto';
import { CleaningTask } from './entities/cleaning-task.entity';

@Injectable()
export class CleaningTasksService {
  constructor(
    @InjectRepository(CleaningTask)
    private readonly cleaningTaskRepository: Repository<CleaningTask>,
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
      where: { tenantId },
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

  async update(
    id: number,
    updateCleaningTaskDto: UpdateCleaningTaskDto,
    tenantId: number,
  ): Promise<CleaningTask> {
    const cleaningTask = await this.findOne(id, tenantId);
    Object.assign(cleaningTask, updateCleaningTaskDto);
    return await this.cleaningTaskRepository.save(cleaningTask);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const cleaningTask = await this.findOne(id, tenantId);
    await this.cleaningTaskRepository.remove(cleaningTask);
  }
}
