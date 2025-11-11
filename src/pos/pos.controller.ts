import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateWalkInSaleDto } from './dto/create-walk-in-sale.dto';
import { AddChargeToRoomDto } from './dto/add-charge-to-room.dto';
import { ActiveRoomResponseDto } from './dto/active-room-response.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('pos')
@ApiBearerAuth('JWT-auth')
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('active-rooms')
  @ApiOperation({
    summary: 'Get all active rooms with checked-in guests',
    description:
      'Returns a list of all rooms that currently have checked-in guests, along with reservation and folio information. Used by POS to display available rooms for charging.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active rooms retrieved successfully',
    type: [ActiveRoomResponseDto],
  })
  getActiveRooms(@CurrentUser() user: CurrentUserData) {
    return this.posService.getActiveRooms(user.tenantId);
  }

  @Post('walk-in-sale')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create walk-in POS sale with payment',
    description:
      'Creates a new folio without reservation, adds a charge, and registers payment immediately. The folio is closed after payment. Used for direct walk-in sales (e.g., customer buys a product and pays immediately).',
  })
  @ApiBody({ type: CreateWalkInSaleDto })
  @ApiResponse({
    status: 201,
    description: 'Walk-in sale created and paid successfully',
    schema: {
      type: 'object',
      properties: {
        folio: {
          type: 'object',
          description: 'Created folio (without reservation, status: CLOSED)',
        },
        charge: {
          type: 'object',
          description: 'Created charge for the sale',
        },
        payment: {
          type: 'object',
          description: 'Registered payment (amount equals total)',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error or insufficient stock (if product has inventory tracking enabled)',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found (if productPublicId is provided)',
  })
  createWalkInSale(
    @Body() dto: CreateWalkInSaleDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.posService.createWalkInSale(dto, user.tenantId);
  }

  @Post('charge-to-room')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add charge to room (guest folio)',
    description:
      'Adds a charge (product or service) to a guest room folio. Used when guests request items/services to be charged to their room. Validates that guest is checked-in and folio is open. Updates folio totals and product inventory automatically.',
  })
  @ApiBody({ type: AddChargeToRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Charge added to room successfully',
    schema: {
      type: 'object',
      description: 'Created folio charge with updated totals',
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error (guest not checked-in, folio closed, insufficient stock, or product inactive)',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation, folio, or product not found',
  })
  addChargeToRoom(
    @Body() dto: AddChargeToRoomDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.posService.addChargeToRoom(dto, user.tenantId);
  }
}
