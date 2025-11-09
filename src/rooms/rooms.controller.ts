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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { Room } from './entities/room.entity';
import { RoomStatus } from './enums/room-status.enum';
import { CleaningStatus } from './enums/cleaning-status.enum';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('rooms')
@ApiBearerAuth('JWT-auth')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new room',
    description: 'Creates a new room for the authenticated tenant',
  })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Room successfully created',
    type: Room,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Room number already exists for this tenant',
  })
  create(@Body() createRoomDto: CreateRoomDto, @CurrentUser() user: CurrentUserData) {
    return this.roomsService.create(createRoomDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all rooms',
    description: 'Retrieves all rooms for the authenticated tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'List of rooms retrieved successfully',
    type: [Room],
  })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.roomsService.findAll(user.tenantId);
  }

  @Get('available-clean')
  @ApiOperation({
    summary: 'Get available and clean rooms',
    description: 'Retrieves all rooms that are available and clean for the authenticated tenant. Useful for quickly finding rooms ready for immediate check-in.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available and clean rooms',
    type: [Room],
  })
  findAvailableAndClean(@CurrentUser() user: CurrentUserData) {
    return this.roomsService.findAvailableAndClean(user.tenantId);
  }

  @Get('calendar-sidebar')
  @ApiOperation({
    summary: 'Get rooms for calendar sidebar with filters',
    description: 'Retrieves rooms for calendar sidebar with optional filters for status, cleaning status, room type, and room number search. Designed for frontend calendar sidebar.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by room number',
    example: '101',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RoomStatus,
    description: 'Filter by room status',
    example: RoomStatus.AVAILABLE,
  })
  @ApiQuery({
    name: 'cleaningStatus',
    required: false,
    enum: CleaningStatus,
    description: 'Filter by cleaning status',
    example: CleaningStatus.CLEAN,
  })
  @ApiQuery({
    name: 'roomTypePublicId',
    required: false,
    type: String,
    description: 'Filter by room type public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered list of rooms for calendar sidebar',
    type: [Room],
  })
  findForCalendarSidebar(
    @Query() filterDto: FilterRoomsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.roomsService.findForCalendarSidebar(user.tenantId, filterDto);
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'Get room by public ID',
    description: 'Retrieves a room by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Room found',
    type: Room,
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  findOne(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.roomsService.findByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId')
  @ApiOperation({
    summary: 'Update room by public ID',
    description: 'Updates room information by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiBody({ type: UpdateRoomDto })
  @ApiResponse({
    status: 200,
    description: 'Room successfully updated',
    type: Room,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Room number already exists for this tenant',
  })
  update(
    @Param('publicId') publicId: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.roomsService.updateByPublicId(publicId, updateRoomDto, user.tenantId);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete room by public ID (soft delete)',
    description: 'Soft deletes a room by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Room successfully deleted (soft delete)',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  remove(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.roomsService.removeByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore deleted room (Admin only)',
    description: 'Restores a soft-deleted room by public UUID. Only accessible by ADMIN role.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Room successfully restored',
    type: Room,
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Room is not deleted',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  restore(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.roomsService.restoreByPublicId(publicId, user.tenantId);
  }
}
