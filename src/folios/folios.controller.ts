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
import { FoliosService } from './folios.service';
import { CreateFolioDto } from './dto/create-folio.dto';
import { UpdateFolioDto } from './dto/update-folio.dto';
import { CreateFolioWithPaymentDto } from './dto/create-folio-with-payment.dto';
import { Folio } from './entities/folio.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('folios')
@ApiBearerAuth('JWT-auth')
@Controller('folios')
export class FoliosController {
  constructor(private readonly foliosService: FoliosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new folio',
    description: 'Creates a new folio for a reservation',
  })
  @ApiBody({ type: CreateFolioDto })
  @ApiResponse({
    status: 201,
    description: 'Folio successfully created',
    type: Folio,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Folio with this number already exists',
  })
  create(
    @Body() createFolioDto: CreateFolioDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.foliosService.create(createFolioDto, user.tenantId);
  }

  @Post('create-with-payment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create folio with payment for existing reservation',
    description: `Creates a folio and registers payment for an existing reservation in a single atomic transaction.

    This endpoint is designed for the second step after creating a reservation:
    STEP 1: POST /reservations (creates reservation, may set status to CHECKED_IN)
    STEP 2: POST /folios/create-with-payment (creates folio + registers payment)

    This method:
    1. Validates the reservation exists and belongs to the tenant
    2. Creates a folio for the reservation (auto-generates folio number)
    3. Registers the payment
    4. Updates folio status to CLOSED if payment covers total amount

    IMPORTANT: This does NOT create or modify the reservation. The reservation must already exist.`,
  })
  @ApiBody({ type: CreateFolioWithPaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Folio successfully created with payment registered',
    type: Folio,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or reservation already has a folio',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  createWithPayment(
    @Body() dto: CreateFolioWithPaymentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.foliosService.createWithPayment(dto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all folios',
    description: 'Retrieves a list of all folios',
  })
  @ApiResponse({
    status: 200,
    description: 'List of folios retrieved successfully',
    type: [Folio],
  })
  findAll() {
    return this.foliosService.findAll();
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get folio by public ID',
    description: 'Retrieves a folio by their public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the folio',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Folio found',
    type: Folio,
  })
  @ApiResponse({
    status: 404,
    description: 'Folio not found',
  })
  findByPublicId(@Param('publicId') publicId: string) {
    return this.foliosService.findByPublicId(publicId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get folio by internal ID',
    description: 'Retrieves a folio by their internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the folio',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Folio found',
    type: Folio,
  })
  @ApiResponse({
    status: 404,
    description: 'Folio not found',
  })
  findOne(@Param('id') id: string) {
    return this.foliosService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update folio',
    description: 'Updates folio information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the folio',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdateFolioDto })
  @ApiResponse({
    status: 200,
    description: 'Folio successfully updated',
    type: Folio,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Folio not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Folio with this number already exists',
  })
  update(@Param('id') id: string, @Body() updateFolioDto: UpdateFolioDto) {
    return this.foliosService.update(+id, updateFolioDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete folio',
    description: 'Deletes a folio by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the folio',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Folio successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Folio not found',
  })
  remove(@Param('id') id: string) {
    return this.foliosService.remove(+id);
  }
}
