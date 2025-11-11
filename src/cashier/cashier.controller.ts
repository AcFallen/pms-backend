import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CashierService } from './cashier.service';
import { OpenCashierSessionDto } from './dto/create-cashier.dto';
import { CloseCashierSessionDto } from './dto/close-cashier.dto';
import { PaginatedCashierSessionsDto } from './dto/paginated-cashier-sessions.dto';
import { CashierSession } from './entities/cashier.entity';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('cashier')
@ApiBearerAuth('JWT-auth')
@Controller('cashier')
export class CashierController {
  constructor(private readonly cashierService: CashierService) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Open a new cashier session',
    description:
      'Opens a new cashier session with an initial cash amount. Only one session can be open at a time per tenant.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cashier session opened successfully',
    type: CashierSession,
  })
  @ApiResponse({
    status: 409,
    description: 'There is already an open cashier session',
  })
  openSession(
    @Body() dto: OpenCashierSessionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.cashierService.openSession(dto, user.userId, user.tenantId);
  }

  @Post(':publicId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close a cashier session',
    description:
      'Closes an existing cashier session by counting the actual cash and comparing it with the expected amount (opening + cash payments).',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Cashier session public ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cashier session closed successfully',
    type: CashierSession,
  })
  @ApiResponse({
    status: 404,
    description: 'Cashier session not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cashier session is already closed',
  })
  closeSession(
    @Param('publicId') publicId: string,
    @Body() dto: CloseCashierSessionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.cashierService.closeSession(
      publicId,
      dto,
      user.userId,
      user.tenantId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all cashier sessions with pagination',
    description:
      'Retrieves a paginated list of cashier sessions for the authenticated tenant',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'List of cashier sessions retrieved successfully',
    type: PaginatedCashierSessionsDto,
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.cashierService.findAll(user.tenantId, page, limit);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get current open cashier session',
    description:
      'Retrieves the currently open cashier session for the tenant, if any',
  })
  @ApiResponse({
    status: 200,
    description: 'Current open session retrieved (or null if none)',
    type: CashierSession,
  })
  getCurrentSession(@CurrentUser() user: CurrentUserData) {
    return this.cashierService.getCurrentSession(user.tenantId);
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'Get cashier session by ID',
    description: 'Retrieves a single cashier session by its public ID',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Cashier session public ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cashier session retrieved successfully',
    type: CashierSession,
  })
  @ApiResponse({
    status: 404,
    description: 'Cashier session not found',
  })
  findOne(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.cashierService.findOne(publicId, user.tenantId);
  }
}
