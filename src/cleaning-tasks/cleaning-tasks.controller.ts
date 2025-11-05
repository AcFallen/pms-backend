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
  create(@Body() createCleaningTaskDto: CreateCleaningTaskDto, @CurrentUser() user: any) {
    return this.cleaningTasksService.create(createCleaningTaskDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all cleaning tasks',
    description: 'Retrieves all cleaning tasks for the authenticated tenant, ordered by priority and creation date',
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
  findByPublicId(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.cleaningTasksService.findByPublicId(publicId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get cleaning task by internal ID',
    description: 'Retrieves a cleaning task by its internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the cleaning task',
    example: 1,
    type: Number,
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cleaningTasksService.findOne(+id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update cleaning task',
    description: 'Updates cleaning task information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the cleaning task',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdateCleaningTaskDto })
  @ApiResponse({
    status: 200,
    description: 'Cleaning task successfully updated',
    type: CleaningTask,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaning task not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateCleaningTaskDto: UpdateCleaningTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.cleaningTasksService.update(+id, updateCleaningTaskDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete cleaning task',
    description: 'Deletes a cleaning task by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the cleaning task',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaning task successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Cleaning task not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.cleaningTasksService.remove(+id, user.tenantId);
  }
}
