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
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new tenant',
    description: 'Creates a new tenant organization',
  })
  @ApiBody({ type: CreateTenantDto })
  @ApiResponse({
    status: 201,
    description: 'Tenant successfully created',
    type: Tenant,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant with this RUC already exists',
  })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all tenants',
    description: 'Retrieves a list of all tenants',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tenants retrieved successfully',
    type: [Tenant],
  })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get tenant by public ID',
    description: 'Retrieves a tenant by their public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant found',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  findByPublicId(@Param('publicId') publicId: string) {
    return this.tenantsService.findByPublicId(publicId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get tenant by internal ID',
    description: 'Retrieves a tenant by their internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the tenant',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant found',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Updates tenant information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the tenant',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdateTenantDto })
  @ApiResponse({
    status: 200,
    description: 'Tenant successfully updated',
    type: Tenant,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant with this RUC already exists',
  })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(+id, updateTenantDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete tenant',
    description: 'Deletes a tenant by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the tenant',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(+id);
  }
}
