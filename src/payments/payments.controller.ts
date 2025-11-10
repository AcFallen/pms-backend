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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentToFolioDto } from './dto/create-payment-to-folio.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new payment',
    description: 'Creates a new payment for a folio',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment successfully created',
    type: Payment,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.paymentsService.create(createPaymentDto, user.tenantId);
  }

  @Post('to-folio')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add payment to existing folio',
    description:
      'Creates a payment for an existing folio. Automatically updates folio balance and closes folio if balance reaches zero. Reference number is auto-generated if not provided.',
  })
  @ApiBody({ type: CreatePaymentToFolioDto })
  @ApiResponse({
    status: 201,
    description: 'Payment successfully created and folio updated',
    type: Payment,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or folio is closed',
  })
  @ApiResponse({
    status: 404,
    description: 'Folio not found',
  })
  createPaymentToFolio(
    @Body() dto: CreatePaymentToFolioDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.paymentsService.createPaymentToFolio(dto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all payments',
    description: 'Retrieves a list of all payments',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payments retrieved successfully',
    type: [Payment],
  })
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get payment by public ID',
    description: 'Retrieves a payment by their public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the payment',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment found',
    type: Payment,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  findByPublicId(@Param('publicId') publicId: string) {
    return this.paymentsService.findByPublicId(publicId);
  }

  @Get('folio/:folioId')
  @ApiOperation({
    summary: 'Get all payments for a specific folio',
    description: 'Retrieves all payments associated with a folio ID',
  })
  @ApiParam({
    name: 'folioId',
    description: 'Internal ID of the folio',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of payments for the folio',
    type: [Payment],
  })
  findByFolioId(@Param('folioId') folioId: string) {
    return this.paymentsService.findByFolioId(+folioId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment by internal ID',
    description: 'Retrieves a payment by their internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the payment',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment found',
    type: Payment,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update payment',
    description: 'Updates payment information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the payment',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdatePaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment successfully updated',
    type: Payment,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete payment',
    description: 'Deletes a payment by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the payment',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment not found',
  })
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(+id);
  }
}
