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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user with hashed password for the current tenant',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User successfully created',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists for this tenant',
  })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.usersService.create(createUserDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users for current tenant',
    description: 'Retrieves a list of all users for the current tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: [User],
  })
  findAllByTenant(@CurrentUser() user: CurrentUserData) {
    return this.usersService.findAllByTenant(user.tenantId);
  }

  @Get('all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description: 'Retrieves a list of ALL users across all tenants. Only accessible by ADMIN role.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users retrieved successfully',
    type: [User],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'Get user by public ID',
    description: 'Retrieves a user by their public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  findByPublicId(@Param('publicId') publicId: string) {
    return this.usersService.findByPublicId(publicId);
  }

  @Patch(':publicId')
  @ApiOperation({
    summary: 'Update user by public ID',
    description: 'Updates user information by their public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  update(@Param('publicId') publicId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateByPublicId(publicId, updateUserDto);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user by public ID (Soft Delete)',
    description: 'Soft deletes a user by their public UUID. User can be restored later.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted (soft delete)',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  remove(@Param('publicId') publicId: string) {
    return this.usersService.removeByPublicId(publicId);
  }

  @Patch(':publicId/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore deleted user (Admin only)',
    description: 'Restores a soft-deleted user by their public UUID. Only accessible by ADMIN role.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the user',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully restored',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User is not deleted',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  restore(@Param('publicId') publicId: string) {
    return this.usersService.restoreByPublicId(publicId);
  }
}
