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
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantVoucherSeriesService } from './tenant-voucher-series.service';
import { CreateVoucherSeriesDto } from './dto/create-voucher-series.dto';
import { UpdateVoucherSeriesDto } from './dto/update-voucher-series.dto';
import { TenantVoucherSeries } from './entities/tenant-voucher-series.entity';
import { VoucherType } from './enums/voucher-type.enum';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('tenant-voucher-series')
@ApiBearerAuth('JWT-auth')
@Controller('tenant-voucher-series')
export class TenantVoucherSeriesController {
  constructor(
    private readonly voucherSeriesService: TenantVoucherSeriesService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new voucher series (Admin only)',
    description: 'Creates a new series for electronic vouchers (SUNAT)',
  })
  @ApiBody({ type: CreateVoucherSeriesDto })
  @ApiResponse({
    status: 201,
    description: 'Voucher series successfully created',
    type: TenantVoucherSeries,
  })
  @ApiResponse({
    status: 409,
    description: 'Series already exists for this voucher type',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  create(
    @Body() createDto: CreateVoucherSeriesDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherSeriesService.create(createDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all voucher series',
    description: 'Retrieves all voucher series for the authenticated tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'List of voucher series retrieved successfully',
    type: [TenantVoucherSeries],
  })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.voucherSeriesService.findAll(user.tenantId);
  }

  @Get('by-type')
  @ApiOperation({
    summary: 'Get active series by voucher type',
    description: 'Retrieves all active series for a specific voucher type',
  })
  @ApiQuery({
    name: 'voucherType',
    enum: VoucherType,
    description: 'Type of voucher (01=Factura, 03=Boleta, etc.)',
    example: VoucherType.FACTURA,
  })
  @ApiResponse({
    status: 200,
    description: 'Active series for the specified type',
    type: [TenantVoucherSeries],
  })
  findByType(
    @Query('voucherType') voucherType: VoucherType,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherSeriesService.findActiveByType(
      user.tenantId,
      voucherType,
    );
  }

  @Get('default/:voucherType')
  @ApiOperation({
    summary: 'Get default series for a voucher type',
    description:
      'Retrieves the default active series for a specific voucher type',
  })
  @ApiParam({
    name: 'voucherType',
    enum: VoucherType,
    description: 'Type of voucher',
    example: VoucherType.FACTURA,
  })
  @ApiResponse({
    status: 200,
    description: 'Default series found',
    type: TenantVoucherSeries,
  })
  @ApiResponse({
    status: 404,
    description: 'No default series found for this voucher type',
  })
  findDefault(
    @Param('voucherType') voucherType: VoucherType,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherSeriesService.findDefaultByType(
      user.tenantId,
      voucherType,
    );
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'Get voucher series by public ID',
    description: 'Retrieves a voucher series by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the voucher series',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Voucher series found',
    type: TenantVoucherSeries,
  })
  @ApiResponse({
    status: 404,
    description: 'Voucher series not found',
  })
  findOne(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherSeriesService.findByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update voucher series by public ID (Admin only)',
    description: 'Updates voucher series information by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the voucher series',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiBody({ type: UpdateVoucherSeriesDto })
  @ApiResponse({
    status: 200,
    description: 'Voucher series successfully updated',
    type: TenantVoucherSeries,
  })
  @ApiResponse({
    status: 404,
    description: 'Voucher series not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Series already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  update(
    @Param('publicId') publicId: string,
    @Body() updateDto: UpdateVoucherSeriesDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherSeriesService.update(publicId, updateDto, user.tenantId);
  }

  @Delete(':publicId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate voucher series (Admin only)',
    description: 'Deactivates a voucher series by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the voucher series',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Voucher series successfully deactivated',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot deactivate default series',
  })
  @ApiResponse({
    status: 404,
    description: 'Voucher series not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  remove(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherSeriesService.remove(publicId, user.tenantId);
  }

  @Post(':publicId/next-number')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get next voucher number',
    description:
      'Obtains the next correlative number for a series and increments the counter',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the voucher series',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Next voucher number obtained',
    schema: {
      example: {
        series: 'F001',
        number: 123,
        fullNumber: 'F001-00000123',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Voucher series not found or inactive',
  })
  getNextNumber(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.voucherSeriesService.getNextVoucherNumber(
      publicId,
      user.tenantId,
    );
  }
}
