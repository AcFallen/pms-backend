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
import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { Rate } from './entities/rate.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('rates')
@ApiBearerAuth('JWT-auth')
@Controller('rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new rate',
    description: 'Creates a new rate for the authenticated tenant',
  })
  @ApiBody({ type: CreateRateDto })
  @ApiResponse({
    status: 201,
    description: 'Rate successfully created',
    type: Rate,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  create(@Body() createRateDto: CreateRateDto, @CurrentUser() user: CurrentUserData) {
    return this.ratesService.create(createRateDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all rates',
    description: 'Retrieves all rates for the authenticated tenant, ordered by priority (DESC) and name (ASC)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of rates retrieved successfully',
    type: [Rate],
  })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.ratesService.findAll(user.tenantId);
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'Get rate by public ID',
    description: 'Retrieves a rate by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the rate',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Rate found',
    type: Rate,
  })
  @ApiResponse({
    status: 404,
    description: 'Rate not found',
  })
  findOne(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.ratesService.findByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId')
  @ApiOperation({
    summary: 'Update rate by public ID',
    description: 'Updates rate information by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the rate',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiBody({ type: UpdateRateDto })
  @ApiResponse({
    status: 200,
    description: 'Rate successfully updated',
    type: Rate,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Rate not found',
  })
  update(
    @Param('publicId') publicId: string,
    @Body() updateRateDto: UpdateRateDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ratesService.updateByPublicId(publicId, updateRateDto, user.tenantId);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete rate (soft delete)',
    description: 'Soft deletes a rate by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the rate',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Rate successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Rate not found',
  })
  remove(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.ratesService.removeByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore deleted rate (Admin only)',
    description: 'Restores a soft-deleted rate by public UUID. Only accessible by ADMIN role.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the rate',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Rate successfully restored',
    type: Rate,
  })
  @ApiResponse({
    status: 404,
    description: 'Rate not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Rate is not deleted',
  })
  restore(@Param('publicId') publicId: string, @CurrentUser() user: CurrentUserData) {
    return this.ratesService.restoreByPublicId(publicId, user.tenantId);
  }
}
