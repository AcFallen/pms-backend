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
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

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
  create(
    @Body() createRoomTypeDto: CreateRoomTypeDto,
    @CurrentUser() user: CurrentUserData,
  ) {
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
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.roomTypesService.findAll(user.tenantId);
  }

  @Get(':publicId')
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
  findByPublicId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.roomTypesService.findByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId')
  @ApiOperation({
    summary: 'Update room type by public ID',
    description: 'Updates room type information by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room type',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
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
    @Param('publicId') publicId: string,
    @Body() updateRoomTypeDto: UpdateRoomTypeDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.roomTypesService.updateByPublicId(
      publicId,
      updateRoomTypeDto,
      user.tenantId,
    );
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete room type by public ID (soft delete)',
    description: 'Soft deletes a room type by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room type',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Room type successfully deleted (soft delete)',
  })
  @ApiResponse({
    status: 404,
    description: 'Room type not found',
  })
  remove(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.roomTypesService.removeByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore deleted room type (Admin only)',
    description:
      'Restores a soft-deleted room type by public UUID. Only accessible by ADMIN role.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the room type',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Room type successfully restored',
    type: RoomType,
  })
  @ApiResponse({
    status: 404,
    description: 'Room type not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Room type is not deleted',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  restore(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.roomTypesService.restoreByPublicId(publicId, user.tenantId);
  }
}
