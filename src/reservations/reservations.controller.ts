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
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterCalendarReservationsDto } from './dto/filter-calendar-reservations.dto';
import { Reservation } from './entities/reservation.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('reservations')
@ApiBearerAuth('JWT-auth')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new reservation',
    description: 'Creates a new reservation for the authenticated tenant. El sistema calcula automáticamente las noches si no se proporcionan. El cobro y la política de checkout dependen de la configuración del tenant.',
  })
  @ApiBody({ type: CreateReservationDto })
  @ApiResponse({
    status: 201,
    description: 'Reservation successfully created',
    type: Reservation,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Reservation code already exists',
  })
  create(@Body() createReservationDto: CreateReservationDto, @CurrentUser() user: any) {
    return this.reservationsService.create(createReservationDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all reservations',
    description: 'Retrieves all reservations for the authenticated tenant, ordered by check-in date',
  })
  @ApiResponse({
    status: 200,
    description: 'List of reservations retrieved successfully',
    type: [Reservation],
  })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.reservationsService.findAll(user.tenantId);
  }

  @Get('calendar-reservations')
  @ApiOperation({
    summary: 'Get reservations for calendar grid',
    description: 'Retrieves reservations within a specific date range for the calendar view. Excludes cancelled reservations. Optimized for frontend calendar grid rendering.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date for calendar range (ISO 8601 format: YYYY-MM-DD)',
    example: '2025-11-08',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'End date for calendar range (ISO 8601 format: YYYY-MM-DD)',
    example: '2025-11-22',
  })
  @ApiQuery({
    name: 'roomPublicId',
    required: false,
    type: String,
    description: 'Optional: Filter by specific room UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of reservations for calendar grid',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          publicId: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
          roomPublicId: { type: 'string', example: '0e4c47ba-b3fc-49b6-ae41-a174334bb525', nullable: true },
          guest: {
            type: 'object',
            properties: {
              publicId: { type: 'string' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              documentType: { type: 'string' },
              documentNumber: { type: 'string' },
            },
          },
          checkInDate: { type: 'string', example: '2025-11-08' },
          checkOutDate: { type: 'string', example: '2025-11-11' },
          checkInTime: { type: 'string', example: '2025-11-08T14:00:00Z', nullable: true, description: 'Hora real de entrada' },
          checkOutTime: { type: 'string', example: '2025-11-11T10:00:00Z', nullable: true, description: 'Hora real de salida' },
          status: { type: 'string', example: 'confirmed' },
          nights: { type: 'number', example: 3, nullable: true },
          hours: { type: 'number', example: 5, nullable: true, description: 'Opcional' },
          appliedRate: { type: 'string', example: '150.00', nullable: true, description: 'Tarifa aplicada' },
          adults: { type: 'number', example: 2 },
          children: { type: 'number', example: 0 },
          totalAmount: { type: 'string', example: '450.00' },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', example: '2025-11-01T10:30:00.000Z' },
          updatedAt: { type: 'string', example: '2025-11-01T10:30:00.000Z' },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date range',
  })
  findForCalendar(
    @Query() filterDto: FilterCalendarReservationsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reservationsService.findForCalendar(filterDto, user.tenantId);
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get reservation by public ID',
    description: 'Retrieves a reservation by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the reservation',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation found',
    type: Reservation,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  findByPublicId(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.reservationsService.findByPublicId(publicId, user.tenantId);
  }

  @Get('code/:reservationCode')
  @ApiOperation({
    summary: 'Get reservation by reservation code',
    description: 'Retrieves a reservation by its unique reservation code',
  })
  @ApiParam({
    name: 'reservationCode',
    description: 'Unique reservation code',
    example: 'RES-2025-001',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation found',
    type: Reservation,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  findByReservationCode(@Param('reservationCode') reservationCode: string, @CurrentUser() user: any) {
    return this.reservationsService.findByReservationCode(reservationCode, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get reservation by internal ID',
    description: 'Retrieves a reservation by its internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the reservation',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation found',
    type: Reservation,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reservationsService.findOne(+id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update reservation',
    description: 'Updates reservation information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the reservation',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdateReservationDto })
  @ApiResponse({
    status: 200,
    description: 'Reservation successfully updated',
    type: Reservation,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Reservation code already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.update(+id, updateReservationDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete reservation',
    description: 'Deletes a reservation by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the reservation',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.reservationsService.remove(+id, user.tenantId);
  }
}
