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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  create(@Body() createRoomDto: CreateRoomDto, @CurrentUser() user: any) {
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
  findAll(@CurrentUser() user: any) {
    return this.roomsService.findAll(user.tenantId);
  }

  @Get('public/:publicId')
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
  findByPublicId(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.roomsService.findByPublicId(publicId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room by internal ID',
    description: 'Retrieves a room by its internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the room',
    example: 1,
    type: Number,
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomsService.findOne(+id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update room',
    description: 'Updates room information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the room',
    example: 1,
    type: Number,
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
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @CurrentUser() user: any,
  ) {
    return this.roomsService.update(+id, updateRoomDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete room (soft delete)',
    description: 'Soft deletes a room by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the room',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Room successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomsService.remove(+id, user.tenantId);
  }
}
