import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CleaningTasksService } from './cleaning-tasks.service';
import { CreateCleaningTaskDto } from './dto/create-cleaning-task.dto';
import { UpdateCleaningTaskDto } from './dto/update-cleaning-task.dto';
import { CleaningTask } from './entities/cleaning-task.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('cleaning-tasks')
@ApiBearerAuth('JWT-auth')
@Controller('cleaning-tasks')
export class CleaningTasksController {
  constructor(private readonly cleaningTasksService: CleaningTasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new cleaning task',
    description: 'Creates a new cleaning task for the authenticated tenant',
  })
  @ApiBody({ type: CreateCleaningTaskDto })
  @ApiResponse({
    status: 201,
    description: 'Cleaning task successfully created',
    type: CleaningTask,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  create(
    @Body() createCleaningTaskDto: CreateCleaningTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.cleaningTasksService.create(
      createCleaningTaskDto,
      user.tenantId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all cleaning tasks',
    description:
      'Retrieves all cleaning tasks for the authenticated tenant, ordered by priority and creation date',
  })
  @ApiResponse({
    status: 200,
    description: 'List of cleaning tasks retrieved successfully',
    type: [CleaningTask],
  })
  findAll(@CurrentUser() user: any) {
    return this.cleaningTasksService.findAll(user.tenantId);
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get cleaning task by public ID',
    description: 'Retrieves a cleaning task by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the cleaning task',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaning task found',
    type: CleaningTask,
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaning task not found',
  })
  findByPublicId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: any,
  ) {
    return this.cleaningTasksService.findByPublicId(publicId, user.tenantId);
  }

  @Patch('public/:publicId/start')
  @ApiOperation({
    summary: 'Start maintenance on a cleaning task',
    description:
      'Sets task status to IN_PROGRESS and auto-assigns to current user',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Cleaning task public ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task started successfully',
    type: CleaningTask,
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaning task not found',
  })
  startMaintenance(
    @Param('publicId') publicId: string,
    @CurrentUser() user: any,
  ) {
    return this.cleaningTasksService.startMaintenance(
      publicId,
      user.userId,
      user.tenantId,
    );
  }

  @Patch('public/:publicId/complete')
  @ApiOperation({
    summary: 'Mark cleaning task as clean/completed',
    description: 'Sets task status to COMPLETED',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Cleaning task public ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Task completed successfully',
    type: CleaningTask,
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaning task not found',
  })
  markAsClean(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.cleaningTasksService.markAsClean(publicId, user.tenantId);
  }
}
