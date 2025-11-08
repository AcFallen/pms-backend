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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { multerConfig } from '../common/config/multer.config';

@ApiTags('tenants')
@ApiBearerAuth('JWT-auth')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('logo', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new tenant (Admin only)',
    description: 'Creates a new tenant organization with optional logo upload',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Hotel Paradise' },
        ruc: { type: 'string', example: '20123456789' },
        businessName: { type: 'string', example: 'Hotel Paradise S.A.C.' },
        email: { type: 'string', example: 'contact@hotelparadise.com' },
        phone: { type: 'string', example: '+51987654321' },
        address: { type: 'string', example: 'Av. Principal 123' },
        district: { type: 'string', example: 'Miraflores' },
        province: { type: 'string', example: 'Lima' },
        department: { type: 'string', example: 'Lima' },
        status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
        plan: { type: 'string', enum: ['basico', 'profesional', 'premium'] },
        maxRooms: { type: 'number', example: 10 },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Hotel logo (PNG, JPG, WEBP - Max 2MB)',
        },
      },
      required: ['name', 'email'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant successfully created',
    type: Tenant,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid file',
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant with this RUC already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  create(
    @Body() createTenantDto: CreateTenantDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.tenantsService.create(createTenantDto, logo);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current tenant profile',
    description: 'Retrieves the tenant information for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant profile retrieved successfully',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  getCurrentTenant(@CurrentUser() user: CurrentUserData) {
    return this.tenantsService.findOne(user.tenantId);
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

  @Patch()
  @UseInterceptors(FileInterceptor('logo', multerConfig))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update current tenant profile',
    description:
      'Updates tenant information for the authenticated user with optional logo upload',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Hotel Paradise' },
        ruc: { type: 'string', example: '20123456789' },
        businessName: { type: 'string', example: 'Hotel Paradise S.A.C.' },
        email: { type: 'string', example: 'contact@hotelparadise.com' },
        phone: { type: 'string', example: '+51987654321' },
        address: { type: 'string', example: 'Av. Principal 123' },
        district: { type: 'string', example: 'Miraflores' },
        province: { type: 'string', example: 'Lima' },
        department: { type: 'string', example: 'Lima' },
        status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
        plan: { type: 'string', enum: ['basico', 'profesional', 'premium'] },
        maxRooms: { type: 'number', example: 10 },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Hotel logo (PNG, JPG, WEBP - Max 2MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant successfully updated',
    type: Tenant,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid file',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant with this RUC already exists',
  })
  updateCurrent(
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.tenantsService.update(user.tenantId, updateTenantDto, logo);
  }

  @Delete('logo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove tenant logo',
    description: 'Removes the logo from the current tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Logo successfully removed',
    type: Tenant,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  removeLogo(@CurrentUser() user: CurrentUserData) {
    return this.tenantsService.removeLogo(user.tenantId);
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
