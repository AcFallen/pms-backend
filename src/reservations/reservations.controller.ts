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
  Res,
  Header,
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
import { Response } from 'express';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CheckoutReservationDto } from './dto/checkout-reservation.dto';
import { FilterCalendarReservationsDto } from './dto/filter-calendar-reservations.dto';
import { CalendarReservationResponseDto } from './dto/calendar-reservation-response.dto';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { PaginatedReservationsResponseDto } from './dto/paginated-reservations-response.dto';
import { FilterReservationsReportDto } from './dto/filter-reservations-report.dto';
import { Reservation } from './entities/reservation.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('reservations')
@ApiBearerAuth('JWT-auth')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new reservation',
    description:
      'Creates a new reservation for the authenticated tenant. El sistema calcula automáticamente las noches si no se proporcionan. El cobro y la política de checkout dependen de la configuración del tenant.',
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
  create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.create(createReservationDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all reservations with pagination and filters',
    description:
      'Retrieves all reservations for the authenticated tenant with optional filters and pagination. Supports filtering by check-in date (exact or range), status, guest name, and document number. Returns paginated results with optimized data structure.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reservations retrieved successfully',
    type: PaginatedReservationsResponseDto,
  })
  findAll(
    @Query() filters: FilterReservationsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reservationsService.findAll(user.tenantId, filters);
  }

  @Get('reports/excel')
  @HttpCode(HttpStatus.OK)
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOperation({
    summary: 'Generate Excel report of reservations by date range',
    description:
      'Generates an Excel report with all reservations within a date range. Groups reservations by check-in date with daily totals. Includes guest info, room, payment methods, invoice details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file generated successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid date range',
  })
  async downloadReservationsReport(
    @Query() filters: FilterReservationsReportDto,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ): Promise<void> {
    const buffer =
      await this.reservationsService.generateReservationsExcelReport(
        user.tenantId,
        filters,
      );

    const filename = `reservas_${filters.startDate}_${filters.endDate}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(Buffer.from(buffer));
  }

  @Get('calendar-reservations')
  @ApiOperation({
    summary: 'Get reservations for calendar grid',
    description:
      'Retrieves simplified reservation data within a specific date range for the calendar view. Excludes cancelled and checked-out reservations. Returns only essential data: publicId, publicRoomId, guestName, checkIn, checkOut.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of simplified reservations for calendar grid',
    type: [CalendarReservationResponseDto],
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
  findByPublicId(
    @Param('publicId') publicId: string,
    @CurrentUser() user: any,
  ) {
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
  findByReservationCode(
    @Param('reservationCode') reservationCode: string,
    @CurrentUser() user: any,
  ) {
    return this.reservationsService.findByReservationCode(
      reservationCode,
      user.tenantId,
    );
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
    return this.reservationsService.update(
      +id,
      updateReservationDto,
      user.tenantId,
    );
  }

  @Post(':publicId/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Checkout reservation',
    description:
      'Performs checkout for a reservation. Validates folio is closed (no debt), updates reservation status to CHECKED_OUT, sets room to AVAILABLE + DIRTY, and creates a high-priority cleaning task.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the reservation',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiBody({ type: CheckoutReservationDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Reservation successfully checked out',
    type: Reservation,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error (not checked in, has outstanding balance, etc.)',
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
  })
  checkout(
    @Param('publicId') publicId: string,
    @Body() dto: CheckoutReservationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.reservationsService.checkout(publicId, user.tenantId, dto);
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
