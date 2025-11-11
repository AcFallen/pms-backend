import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateWalkInSaleDto } from './dto/create-walk-in-sale.dto';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('pos')
@ApiBearerAuth('JWT-auth')
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

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
}
