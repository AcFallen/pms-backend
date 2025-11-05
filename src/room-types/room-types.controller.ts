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
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomType } from './entities/room-type.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('room-types')
@ApiBearerAuth('JWT-auth')
@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new room type',
    description: 'Creates a new room type for the authenticated tenant',
  })
  @ApiBody({ type: CreateRoomTypeDto })
  @ApiResponse({
    status: 201,
    description: 'Room type successfully created',
    type: RoomType,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  create(@Body() createRoomTypeDto: CreateRoomTypeDto, @CurrentUser() user: any) {
    return this.roomTypesService.create(createRoomTypeDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all room types',
    description: 'Retrieves all room types for the authenticated tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'List of room types retrieved successfully',
    type: [RoomType],
  })
  findAll(@CurrentUser() user: any) {
    return this.roomTypesService.findAll(user.tenantId);
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get room type by public ID',
    description: 'Retrieves a room type by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room type',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Room type found',
    type: RoomType,
  })
  @ApiResponse({
    status: 404,
    description: 'Room type not found',
  })
  findByPublicId(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.roomTypesService.findByPublicId(publicId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get room type by internal ID',
    description: 'Retrieves a room type by its internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the room type',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Room type found',
    type: RoomType,
  })
  @ApiResponse({
    status: 404,
    description: 'Room type not found',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomTypesService.findOne(+id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update room type',
    description: 'Updates room type information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the room type',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdateRoomTypeDto })
  @ApiResponse({
    status: 200,
    description: 'Room type successfully updated',
    type: RoomType,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Room type not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateRoomTypeDto: UpdateRoomTypeDto,
    @CurrentUser() user: any,
  ) {
    return this.roomTypesService.update(+id, updateRoomTypeDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete room type (soft delete)',
    description: 'Soft deletes a room type by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the room type',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Room type successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Room type not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.roomTypesService.remove(+id, user.tenantId);
  }
}
