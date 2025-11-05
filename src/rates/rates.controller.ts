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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  create(@Body() createRateDto: CreateRateDto, @CurrentUser() user: any) {
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
  findAll(@CurrentUser() user: any) {
    return this.ratesService.findAll(user.tenantId);
  }

  @Get('public/:publicId')
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
  findByPublicId(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.ratesService.findByPublicId(publicId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get rate by internal ID',
    description: 'Retrieves a rate by its internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the rate',
    example: 1,
    type: Number,
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ratesService.findOne(+id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update rate',
    description: 'Updates rate information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the rate',
    example: 1,
    type: Number,
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
    @Param('id') id: string,
    @Body() updateRateDto: UpdateRateDto,
    @CurrentUser() user: any,
  ) {
    return this.ratesService.update(+id, updateRateDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete rate (soft delete)',
    description: 'Soft deletes a rate by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the rate',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Rate successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Rate not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ratesService.remove(+id, user.tenantId);
  }
}
