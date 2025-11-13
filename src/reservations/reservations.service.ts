import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterCalendarReservationsDto } from './dto/filter-calendar-reservations.dto';
import { CalendarReservationResponseDto } from './dto/calendar-reservation-response.dto';
import { Reservation } from './entities/reservation.entity';
import { Room } from '../rooms/entities/room.entity';
import { Guest } from '../guests/entities/guest.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { Folio } from '../folios/entities/folio.entity';
import { FolioCharge } from '../folio-charges/entities/folio-charge.entity';
import { CleaningTask } from '../cleaning-tasks/entities/cleaning-task.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { RoomStatus } from '../rooms/enums/room-status.enum';
import { CleaningStatus } from '../rooms/enums/cleaning-status.enum';
import { FolioStatus } from '../folios/enums/folio-status.enum';
import { ChargeType } from '../folio-charges/enums/charge-type.enum';
import { TaskStatus } from '../cleaning-tasks/enums/task-status.enum';
import { TaskPriority } from '../cleaning-tasks/enums/task-priority.enum';
import { TaskType } from '../cleaning-tasks/enums/task-type.enum';
import { CheckoutReservationDto } from './dto/checkout-reservation.dto';
import { FilterReservationsDto } from './dto/filter-reservations.dto';
import { PaginatedReservationsResponseDto } from './dto/paginated-reservations-response.dto';
import { ReservationListItemDto } from './dto/reservation-list-item.dto';
import { FilterReservationsReportDto } from './dto/filter-reservations-report.dto';
import * as ExcelJS from 'exceljs';
import { Payment } from '../payments/entities/payment.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceType } from '../invoices/enums/invoice-type.enum';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
    @InjectRepository(Folio)
    private readonly folioRepository: Repository<Folio>,
    @InjectRepository(FolioCharge)
    private readonly folioChargeRepository: Repository<FolioCharge>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
    tenantId: number,
  ): Promise<Reservation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if reservation code already exists
      const existingReservation = await queryRunner.manager.findOne(
        Reservation,
        {
          where: {
            reservationCode: createReservationDto.reservationCode,
            tenantId,
          },
        },
      );
      if (existingReservation) {
        throw new ConflictException(
          `Reservation code ${createReservationDto.reservationCode} already exists`,
        );
      }

      // Resolve guest publicId to internal ID
      const guest = await queryRunner.manager.findOne(Guest, {
        where: {
          publicId: createReservationDto.guestPublicId,
          tenantId,
        },
      });
      if (!guest) {
        throw new NotFoundException(
          `Guest with publicId ${createReservationDto.guestPublicId} not found`,
        );
      }

      // Resolve roomType publicId to internal ID
      const roomType = await queryRunner.manager.findOne(RoomType, {
        where: {
          publicId: createReservationDto.roomTypePublicId,
          tenantId,
        },
      });
      if (!roomType) {
        throw new NotFoundException(
          `Room type with publicId ${createReservationDto.roomTypePublicId} not found`,
        );
      }

      // Resolve room publicId to internal ID (if provided)
      let roomId: number | null = null;
      let room: Room | null = null;
      if (createReservationDto.roomPublicId) {
        room = await queryRunner.manager.findOne(Room, {
          where: {
            publicId: createReservationDto.roomPublicId,
            tenantId,
          },
        });
        if (!room) {
          throw new NotFoundException(
            `Room with publicId ${createReservationDto.roomPublicId} not found`,
          );
        }
        roomId = room.id;
      }

      // Determine if it's hourly or nightly reservation
      const isHourlyReservation = !!createReservationDto.hours;

      // Calculate nights if not provided (only for non-hourly reservations)
      let nights = createReservationDto.nights;
      if (!nights && !isHourlyReservation) {
        const checkIn = new Date(createReservationDto.checkInDate);
        const checkOut = new Date(createReservationDto.checkOutDate);
        const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
        nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // If same day and not hourly, set to 1 night minimum
        if (nights === 0) {
          nights = 1;
        }
      }

      // Create reservation
      const reservation = queryRunner.manager.create(Reservation, {
        reservationCode: createReservationDto.reservationCode,
        status: createReservationDto.status,
        source: createReservationDto.source,
        checkInDate: createReservationDto.checkInDate,
        checkOutDate: createReservationDto.checkOutDate,
        checkInTime:
          createReservationDto.status === ReservationStatus.CHECKED_IN
            ? new Date()
            : null,
        nights,
        hours: createReservationDto.hours,
        adults: createReservationDto.adults,
        children: createReservationDto.children,
        appliedRate: createReservationDto.appliedRate,
        totalAmount: createReservationDto.totalAmount,
        notes: createReservationDto.notes,
        guestId: guest.id,
        roomTypeId: roomType.id,
        roomId,
        tenantId,
      });

      const savedReservation = await queryRunner.manager.save(
        Reservation,
        reservation,
      );

      // Generate folio number
      const folioNumber = await this.generateFolioNumber(queryRunner, tenantId);

      // Create folio for the reservation
      const folioTotalConIGV = parseFloat(
        createReservationDto.totalAmount.toString(),
      );
      // Calcular subtotal sin IGV y el IGV (sin redondear intermedios para evitar errores de redondeo)
      const folioSubtotalSinIGV = folioTotalConIGV / 1.18;
      const folioTax = folioTotalConIGV - folioSubtotalSinIGV;

      const folio = new Folio();
      folio.tenantId = tenantId;
      folio.reservationId = savedReservation.id;
      folio.folioNumber = folioNumber;
      folio.status = FolioStatus.OPEN;
      folio.subtotal = parseFloat(folioSubtotalSinIGV.toFixed(2)); // Sin IGV
      folio.tax = parseFloat(folioTax.toFixed(2)); // IGV 18%
      folio.total = folioTotalConIGV; // Con IGV (usar el valor original)
      folio.balance = folioTotalConIGV;
      folio.notes = null;

      const savedFolio = await queryRunner.manager.save(folio);

      // Create folio charge for room accommodation
      let roomDescription: string;
      let quantity: number;
      let unitPriceConIGV: number;

      if (isHourlyReservation) {
        // Hourly reservation
        const hours = createReservationDto.hours!; // Non-null assertion since we checked isHourlyReservation
        roomDescription = room
          ? `${hours} hora(s) - Habitación ${room.roomNumber} (${roomType.name})`
          : `${hours} hora(s) - ${roomType.name}`;
        quantity = hours;
        unitPriceConIGV = parseFloat((folioTotalConIGV / hours).toFixed(2));
      } else {
        // Nightly reservation
        const nightsValue = nights!; // Non-null assertion since we set it above
        roomDescription = room
          ? `${nightsValue} noche(s) - Habitación ${room.roomNumber} (${roomType.name})`
          : `${nightsValue} noche(s) - ${roomType.name}`;
        quantity = nightsValue;
        unitPriceConIGV = parseFloat(
          (folioTotalConIGV / nightsValue).toFixed(2),
        );
      }

      const folioCharge = queryRunner.manager.create(FolioCharge, {
        tenantId,
        folioId: savedFolio.id,
        chargeType: ChargeType.ROOM,
        productId: null,
        description: roomDescription,
        quantity,
        unitPrice: unitPriceConIGV, // Precio CON IGV incluido
        total: folioTotalConIGV, // Total CON IGV incluido
        chargeDate: new Date(),
      });

      await queryRunner.manager.save(FolioCharge, folioCharge);

      // Update room status to OCCUPIED if checking in with assigned room
      if (savedReservation.status === ReservationStatus.CHECKED_IN && roomId) {
        await queryRunner.manager.update(
          Room,
          { id: roomId, tenantId },
          { status: RoomStatus.OCCUPIED },
        );
      }

      await queryRunner.commitTransaction();

      return savedReservation;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    tenantId: number,
    filters: FilterReservationsDto,
  ): Promise<PaginatedReservationsResponseDto> {
    const {
      page = 1,
      limit = 10,
      checkInDate,
      checkInStartDate,
      checkInEndDate,
      status,
      search,
    } = filters;

    // Build query for data retrieval - use leftJoinAndSelect to load relations
    const query = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.guest', 'guest')
      .leftJoinAndSelect('reservation.room', 'room')
      .where('reservation.tenantId = :tenantId', { tenantId });

    // Apply filters
    if (checkInDate) {
      query.andWhere('DATE(reservation.checkInDate) = :checkInDate', {
        checkInDate,
      });
    }

    if (checkInStartDate && checkInEndDate) {
      query.andWhere(
        'DATE(reservation.checkInDate) BETWEEN :checkInStartDate AND :checkInEndDate',
        {
          checkInStartDate,
          checkInEndDate,
        },
      );
    }

    if (status) {
      query.andWhere('reservation.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        "(guest.firstName ILIKE :search OR guest.lastName ILIKE :search OR CONCAT(guest.firstName, ' ', guest.lastName) ILIKE :search OR guest.documentNumber ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    // Order by check-in date descending, then creation date
    query
      .orderBy('reservation.checkInDate', 'DESC')
      .addOrderBy('reservation.createdAt', 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Execute query - getManyAndCount returns [data, total] in one query
    const [reservations, total] = await query.getManyAndCount();

    // Get reservation IDs that have invoices
    const reservationIds = reservations.map((r) => r.id);
    let reservationsWithInvoices: any[] = [];

    // Only query if there are reservations to check
    if (reservationIds.length > 0) {
      reservationsWithInvoices = await this.dataSource
        .createQueryBuilder()
        .select('DISTINCT reservation.id', 'reservationId')
        .from('reservations', 'reservation')
        .innerJoin('folios', 'folio', 'folio.reservationId = reservation.id')
        .innerJoin('invoices', 'invoice', 'invoice.folioId = folio.id')
        .where('reservation.id IN (:...reservationIds)', { reservationIds })
        .andWhere('reservation.tenantId = :tenantId', { tenantId })
        .getRawMany();
    }

    // Create a Set for quick lookup
    const invoicedReservationIds = new Set(
      reservationsWithInvoices.map((r) => r.reservationId),
    );

    // Transform to DTO
    const data: ReservationListItemDto[] = reservations.map((reservation) => ({
      publicId: reservation.publicId,
      reservationCode: reservation.reservationCode,
      guestFullName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
      guestDocument: reservation.guest.documentNumber,
      checkInDate:
        reservation.checkInDate instanceof Date
          ? reservation.checkInDate.toISOString().split('T')[0]
          : reservation.checkInDate,
      checkOutDate:
        reservation.checkOutDate instanceof Date
          ? reservation.checkOutDate.toISOString().split('T')[0]
          : reservation.checkOutDate,
      roomNumber: reservation.room?.roomNumber || 'N/A',
      nights: reservation.nights ?? 0,
      hours: reservation.hours,
      totalAmount: parseFloat(reservation.totalAmount.toString()),
      status: reservation.status,
      createdAt: reservation.createdAt,
      hasInvoice: invoicedReservationIds.has(reservation.id),
      checkInTime: reservation.checkInTime,
      checkOutTime: reservation.checkOutTime,
    }));

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: number, tenantId: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id, tenantId },
      relations: ['guest', 'room', 'roomType'],
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    return reservation;
  }

  async findByPublicId(publicId: string, tenantId: number): Promise<any> {
    const reservation = await this.reservationRepository
      .createQueryBuilder('reservation')
      .select([
        'reservation.publicId',
        'reservation.reservationCode',
        'reservation.status',
        'reservation.source',
        'reservation.checkInDate',
        'reservation.checkOutDate',
        'reservation.checkInTime',
        'reservation.checkOutTime',
        'reservation.nights',
        'reservation.hours',
        'reservation.adults',
        'reservation.children',
        'reservation.appliedRate',
        'reservation.totalAmount',
        'reservation.notes',
        'reservation.createdAt',
        'reservation.updatedAt',
      ])
      .leftJoin('reservation.guest', 'guest')
      .addSelect([
        'guest.publicId',
        'guest.firstName',
        'guest.lastName',
        'guest.documentType',
        'guest.documentNumber',
        'guest.email',
        'guest.phone',
      ])
      .leftJoin('reservation.room', 'room')
      .addSelect(['room.publicId', 'room.roomNumber'])
      .leftJoin('reservation.roomType', 'roomType')
      .addSelect(['roomType.publicId', 'roomType.name', 'roomType.description'])
      .leftJoin('reservation.folios', 'folio')
      .addSelect([
        'folio.id', // Internal ID needed to fetch folio charges
        'folio.publicId',
        'folio.folioNumber',
        'folio.status',
        'folio.subtotal',
        'folio.tax',
        'folio.total',
        'folio.balance',
        'folio.notes',
        'folio.closedAt',
        'folio.createdAt',
        'folio.updatedAt',
      ])
      .leftJoin('folio.payments', 'payment')
      .addSelect([
        'payment.publicId',
        'payment.paymentMethod',
        'payment.amount',
        'payment.referenceNumber',
        'payment.paymentDate',
        'payment.notes',
        'payment.createdAt',
      ])
      .where('reservation.publicId = :publicId', { publicId })
      .andWhere('reservation.tenantId = :tenantId', { tenantId })
      .orderBy('payment.paymentDate', 'DESC')
      .getOne();

    if (!reservation) {
      throw new NotFoundException(
        `Reservation with public ID ${publicId} not found`,
      );
    }

    // Manually load folio charges for each folio
    if (reservation.folios && reservation.folios.length > 0) {
      for (const folio of reservation.folios) {
        const charges = await this.folioChargeRepository.find({
          where: { folioId: folio.id, tenantId },
          select: [
            'publicId',
            'chargeType',
            'description',
            'quantity',
            'unitPrice',
            'total',
            'chargeDate',
            'createdAt',
          ],
          order: { chargeDate: 'ASC' },
        });
        folio['charges'] = charges;
      }
    }

    return reservation;
  }

  async findByReservationCode(
    reservationCode: string,
    tenantId: number,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { reservationCode, tenantId },
      relations: ['guest', 'room', 'roomType'],
    });
    if (!reservation) {
      throw new NotFoundException(
        `Reservation with code ${reservationCode} not found`,
      );
    }
    return reservation;
  }

  async update(
    id: number,
    updateReservationDto: UpdateReservationDto,
    tenantId: number,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id, tenantId);

    // Check if reservation code is being updated and if it already exists
    if (
      updateReservationDto.reservationCode &&
      updateReservationDto.reservationCode !== reservation.reservationCode
    ) {
      const existingReservation = await this.reservationRepository.findOne({
        where: {
          reservationCode: updateReservationDto.reservationCode,
          tenantId,
        },
      });
      if (existingReservation) {
        throw new ConflictException(
          `Reservation code ${updateReservationDto.reservationCode} already exists`,
        );
      }
    }

    const oldStatus = reservation.status;
    const oldRoomId = reservation.roomId;

    Object.assign(reservation, updateReservationDto);

    // Set checkInTime if status is changing to CHECKED_IN
    if (
      updateReservationDto.status === ReservationStatus.CHECKED_IN &&
      oldStatus !== ReservationStatus.CHECKED_IN
    ) {
      reservation.checkInTime = new Date();
    }

    // Set checkOutTime if status is changing to CHECKED_OUT
    if (
      updateReservationDto.status === ReservationStatus.CHECKED_OUT &&
      oldStatus !== ReservationStatus.CHECKED_OUT
    ) {
      reservation.checkOutTime = new Date();
    }

    const updatedReservation =
      await this.reservationRepository.save(reservation);

    // Handle room status changes when reservation status changes
    const newStatus = updatedReservation.status;
    const newRoomId = updatedReservation.roomId;

    // Update room to OCCUPIED if status changed to CHECKED_IN and room is assigned
    if (
      newStatus === ReservationStatus.CHECKED_IN &&
      oldStatus !== ReservationStatus.CHECKED_IN &&
      newRoomId
    ) {
      await this.roomRepository.update(
        { id: newRoomId, tenantId },
        { status: RoomStatus.OCCUPIED },
      );
    }

    // Update room to AVAILABLE if status changed from CHECKED_IN to CHECKED_OUT
    if (
      newStatus === ReservationStatus.CHECKED_OUT &&
      oldStatus === ReservationStatus.CHECKED_IN &&
      oldRoomId
    ) {
      await this.roomRepository.update(
        { id: oldRoomId, tenantId },
        { status: RoomStatus.AVAILABLE },
      );
    }

    return updatedReservation;
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const reservation = await this.findOne(id, tenantId);
    await this.reservationRepository.remove(reservation);
  }

  async findForCalendar(
    filterDto: FilterCalendarReservationsDto,
    tenantId: number,
  ): Promise<CalendarReservationResponseDto[]> {
    const { startDate, endDate, roomPublicId } = filterDto;

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.guest', 'guest')
      .leftJoinAndSelect('reservation.room', 'room')
      .where('reservation.tenantId = :tenantId', { tenantId })
      // Exclude cancelled and checked-out reservations from calendar
      .andWhere('reservation.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          ReservationStatus.CANCELLED,
          ReservationStatus.CHECKED_OUT,
        ],
      })
      // Find reservations that overlap with the date range
      // A reservation overlaps if: checkInDate <= endDate AND checkOutDate >= startDate
      .andWhere('reservation.checkInDate <= :endDate', { endDate })
      .andWhere('reservation.checkOutDate >= :startDate', { startDate });

    // Filter by room if provided
    if (roomPublicId) {
      queryBuilder.andWhere('room.publicId = :roomPublicId', { roomPublicId });
    }

    // Order by check-in date
    queryBuilder.orderBy('reservation.checkInDate', 'ASC');

    const reservations = await queryBuilder.getMany();

    // Transform to simplified DTO for frontend calendar
    return reservations.map((reservation) => {
      // TypeORM returns date columns as strings (YYYY-MM-DD format from PostgreSQL date type)
      const checkInDate =
        typeof reservation.checkInDate === 'string'
          ? reservation.checkInDate
          : reservation.checkInDate.toISOString().split('T')[0];

      const checkOutDate =
        typeof reservation.checkOutDate === 'string'
          ? reservation.checkOutDate
          : reservation.checkOutDate.toISOString().split('T')[0];

      return {
        publicId: reservation.publicId,
        publicRoomId: reservation.room?.publicId || null,
        guestName:
          `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim(),
        checkIn: checkInDate,
        checkOut: checkOutDate,
      };
    });
  }

  /**
   * Performs checkout for a reservation.
   * This method:
   * 1. Validates reservation exists and is in CHECKED_IN status
   * 2. Validates reservation has a folio
   * 3. Validates folio is closed (no outstanding balance)
   * 4. Validates reservation has a room assigned
   * 5. Validates room exists
   * 6. Updates reservation status to CHECKED_OUT
   * 7. Updates room status to AVAILABLE and cleaning status to DIRTY
   * 8. Creates a high-priority cleaning task for housekeeping
   *
   * All operations are performed in a transaction to ensure data consistency.
   */
  async checkout(
    publicId: string,
    tenantId: number,
    dto?: CheckoutReservationDto,
  ): Promise<Reservation> {
    // Use QueryRunner for transaction management
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find reservation with folio
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { publicId, tenantId },
        relations: ['folios'],
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation with publicId ${publicId} not found`,
        );
      }

      // 2. Validate reservation status
      if (reservation.status !== ReservationStatus.CHECKED_IN) {
        throw new BadRequestException(
          `Cannot checkout reservation ${reservation.reservationCode}. Current status is ${reservation.status}. Only CHECKED_IN reservations can be checked out.`,
        );
      }

      // 3. Validate reservation has folio
      if (!reservation.folios || reservation.folios.length === 0) {
        throw new BadRequestException(
          `Cannot checkout reservation ${reservation.reservationCode}. No folio found. Please create a folio before checkout.`,
        );
      }

      // Get the first (and should be only) folio
      const folio = reservation.folios[0];

      // 4. Validate folio is closed or has no balance
      const balance = parseFloat(folio.balance?.toString() || '0');
      if (folio.status !== FolioStatus.CLOSED && balance > 0) {
        throw new BadRequestException(
          `Cannot checkout reservation ${reservation.reservationCode}. Outstanding balance of $${balance} on folio ${folio.folioNumber}. Please settle all payments before checkout.`,
        );
      }

      // 5. Validate reservation has a room
      if (!reservation.roomId) {
        throw new BadRequestException(
          `Cannot checkout reservation ${reservation.reservationCode}. No room assigned to reservation.`,
        );
      }

      // 6. Find the room
      const room = await queryRunner.manager.findOne(Room, {
        where: { id: reservation.roomId, tenantId },
      });

      if (!room) {
        throw new NotFoundException(
          `Room with ID ${reservation.roomId} not found`,
        );
      }

      // 7. Update reservation to CHECKED_OUT
      await queryRunner.manager.update(
        Reservation,
        { id: reservation.id },
        {
          status: ReservationStatus.CHECKED_OUT,
          checkOutTime: new Date(),
          notes: dto?.checkoutNotes
            ? `${reservation.notes || ''}\nCheckout: ${dto.checkoutNotes}`.trim()
            : reservation.notes,
        },
      );

      // 8. Update room status to AVAILABLE and DIRTY
      await queryRunner.manager.update(
        Room,
        { id: room.id },
        {
          status: RoomStatus.AVAILABLE,
          cleaningStatus: CleaningStatus.DIRTY,
        },
      );

      // 9. Create cleaning task
      const cleaningTask = new CleaningTask();
      cleaningTask.roomId = room.id;
      cleaningTask.tenantId = tenantId;
      cleaningTask.status = TaskStatus.PENDING;
      cleaningTask.priority = TaskPriority.HIGH;
      cleaningTask.taskType = TaskType.CHECKOUT;
      cleaningTask.assignedTo = null; // Will be assigned later by supervisor
      cleaningTask.notes =
        `Checkout cleaning for reservation ${reservation.reservationCode}. Guest: ${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim();

      await queryRunner.manager.save(CleaningTask, cleaningTask);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Return updated reservation
      return await this.findByPublicId(publicId, tenantId);
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }

 /**
   * Genera un reporte Excel de reservas por rango de fechas
   * Agrupa las reservas por día y calcula totales diarios
   */
  async generateReservationsExcelReport(
    tenantId: number,
    filters: FilterReservationsReportDto,
  ): Promise<ExcelJS.Buffer> {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);

    // Obtener todas las reservas en el rango de fechas con checkInTime
    const reservations = await this.reservationRepository.find({
      where: {
        tenantId,
        checkInDate: Between(startDate, endDate),
      },
      relations: [
        'guest',
        'room',
        'folios',
        'folios.payments',
        'folios.invoices',
        'folios.folioCharges',
      ],
      order: {
        checkInDate: 'ASC',
        checkInTime: 'ASC',
      },
    });

    // Filtrar solo reservas con checkInTime
    const reservationsWithCheckIn = reservations.filter(
      (r) => r.checkInTime !== null,
    );

    // Zona horaria de Perú
    const timeZone = 'America/Lima';

    // Agrupar reservas por día usando la fecha en hora de Perú
    const reservationsByDay = new Map<string, typeof reservationsWithCheckIn>();

    for (const reservation of reservationsWithCheckIn) {
      // Convertir checkInTime a hora de Perú para obtener el día correcto
      const checkInTimePeru = toZonedTime(
        new Date(reservation.checkInTime!),
        timeZone,
      );
      const dayKey = format(checkInTimePeru, 'yyyy-MM-dd');

      if (!reservationsByDay.has(dayKey)) {
        reservationsByDay.set(dayKey, []);
      }
      reservationsByDay.get(dayKey)!.push(reservation);
    }

    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Reservas');

    // Definir anchos de columnas
    worksheet.columns = [
      { key: 'fecha', width: 15 },
      { key: 'checkIn', width: 12 },
      { key: 'checkOut', width: 12 },
      { key: 'documento', width: 15 },
      { key: 'nombres', width: 35 },
      { key: 'habitacion', width: 12 },
      { key: 'metodoPago', width: 25 },
      { key: 'monto', width: 12 },
      { key: 'ruc', width: 15 },
      { key: 'empresa', width: 30 },
      { key: 'boleta', width: 18 },
      { key: 'obs', width: 20 },
      { key: 'pos', width: 30 },
    ];

    // Configurar encabezado de columnas (se aplicará después de cada encabezado de día)
    const columnHeaders = [
      'Fecha',
      'Check-In',
      'Check-Out',
      'Documento',
      'Nombres y Apellidos',
      'Habitación',
      'Método de Pago',
      'Monto',
      'RUC',
      'EMPRESA',
      'Boleta',
      'OBS',
      'POS',
    ];

    let currentRow = 1;

    // Meses en español
    const mesesES = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];

    // Ordenar días cronológicamente
    const sortedDays = Array.from(reservationsByDay.keys()).sort();

    for (const dayKey of sortedDays) {
      const dayReservations = reservationsByDay.get(dayKey)!;

      // Parsear el dayKey (formato 'yyyy-MM-dd') correctamente para la zona horaria de Perú
      const [year, month, day] = dayKey.split('-').map(Number);

      // Formato: "01 de enero de 2025"
      const dayHeader = `${day.toString().padStart(2, '0')} de ${mesesES[month - 1]} de ${year}`;

      // Agregar encabezado del día
      const dayHeaderRow = worksheet.getRow(currentRow);
      dayHeaderRow.getCell(1).value = dayHeader;
      dayHeaderRow.getCell(1).font = {
        bold: true,
        size: 13,
        color: { argb: 'FFFFFFFF' },
      };
      dayHeaderRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF509A95' },
      };
      dayHeaderRow.getCell(1).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };

      // Merge cells para el encabezado del día (A-M)
      worksheet.mergeCells(currentRow, 1, currentRow, 13);

      // Aplicar bordes al encabezado del día
      for (let col = 1; col <= 13; col++) {
        dayHeaderRow.getCell(col).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      }

      dayHeaderRow.height = 25;
      currentRow++;

      // Agregar encabezados de columnas
      const headerRow = worksheet.getRow(currentRow);
      columnHeaders.forEach((header, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = header;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF509A95' },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
      headerRow.height = 22;
      currentRow++;

      // Agregar datos de reservas del día
      let dayTotal = 0;

      for (const reservation of dayReservations) {
        const dataRow = worksheet.getRow(currentRow);

        // Zona horaria de Perú
        const timeZone = 'America/Lima';

        // Convertir checkInTime a hora de Perú y formatear fecha (dd/mm/yyyy)
        const checkInTimePeru = reservation.checkInTime
          ? toZonedTime(new Date(reservation.checkInTime), timeZone)
          : null;

        const fechaFormat = checkInTimePeru
          ? format(checkInTimePeru, 'dd/MM/yyyy')
          : new Date(reservation.checkInDate).toLocaleDateString('es-PE');

        // Formatear horas (HH:MM) en zona horaria de Perú
        const checkInHour = checkInTimePeru
          ? format(checkInTimePeru, 'HH:mm')
          : '';

        const checkOutHour = reservation.checkOutTime
          ? format(
              toZonedTime(new Date(reservation.checkOutTime), timeZone),
              'HH:mm',
            )
          : '';

        // Documento del huésped
        const documento = `${reservation.guest.documentType} ${reservation.guest.documentNumber}`;

        // Nombres completos
        const nombres =
          `${reservation.guest.firstName || ''} ${reservation.guest.lastName || ''}`.trim();

        // Habitación
        const habitacion = reservation.room?.roomNumber || '';

        // Métodos de pago (de todos los folios)
        const paymentMethods = new Set<string>();
        const rawPaymentMethods = new Set<string>(); // Para detectar los métodos originales
        const paymentMethodTranslations: Record<string, string> = {
          cash: 'Efectivo',
          card: 'Tarjeta',
          transfer: 'Transferencia',
          yape: 'Yape',
          plin: 'Plin',
        };

        for (const folio of reservation.folios) {
          for (const payment of folio.payments || []) {
            rawPaymentMethods.add(payment.paymentMethod); // Guardar método original
            const translatedMethod =
              paymentMethodTranslations[payment.paymentMethod] ||
              payment.paymentMethod;
            paymentMethods.add(translatedMethod);
          }
        }
        const metodoPago = Array.from(paymentMethods).join(' | ') || '';

        // Determinar el color de fondo para la celda de nombres basado en métodos de pago
        let nombresCellColor: string | null = null;
        const hasCash = rawPaymentMethods.has('cash');
        const hasOtherMethods = Array.from(rawPaymentMethods).some(
          (method) => method !== 'cash',
        );

        if (hasCash && hasOtherMethods) {
          // Ambos: efectivo y otros métodos -> color café/marrón
          nombresCellColor = 'FFC19A6B'; // Color café/marrón
        } else if (!hasCash && hasOtherMethods) {
          // Solo otros métodos (no efectivo) -> color verde
          nombresCellColor = 'FF90EE90'; // Color verde claro
        }
        // Si es solo efectivo o no hay métodos de pago, nombresCellColor permanece null (sin color)

        // Monto total de la reserva
        const monto = parseFloat(reservation.totalAmount.toString());
        dayTotal += monto;

        // Buscar factura (invoice de tipo FACTURA) o boleta
        let ruc = '';
        let empresa = '';
        let boleta = '';
        let invoiceType: InvoiceType | null = null;

        for (const folio of reservation.folios) {
          const facturaInvoice = folio.invoices?.find(
            (inv) => inv.invoiceType === InvoiceType.FACTURA,
          );
          if (facturaInvoice) {
            ruc = facturaInvoice.customerDocumentNumber;
            empresa = facturaInvoice.customerName;
            boleta = `${facturaInvoice.series}-${facturaInvoice.number}`;
            invoiceType = InvoiceType.FACTURA;
            break;
          }

          // Si no hay factura, buscar boleta
          if (!boleta) {
            const boletaInvoice = folio.invoices?.find(
              (inv) => inv.invoiceType === InvoiceType.BOLETA,
            );
            if (boletaInvoice) {
              boleta = `${boletaInvoice.series}-${boletaInvoice.number}`;
              invoiceType = InvoiceType.BOLETA;
            }
          }
        }

        // Determinar el color de fondo para la celda de boleta
        let boletaCellColor: string | null = null;

        if (boleta && invoiceType) {
          // Si tiene múltiples métodos de pago (efectivo + otros) -> café
          if (hasCash && hasOtherMethods) {
            boletaCellColor = 'FFC19A6B'; // Color café/marrón
          }
          // Factura con pago NO efectivo (tarjeta, transferencia, yape, plin) -> azul
          else if (
            invoiceType === InvoiceType.FACTURA &&
            !hasCash &&
            hasOtherMethods
          ) {
            boletaCellColor = 'FF4169E1'; // Color azul (Royal Blue)
          }
          // Factura con pago efectivo -> plomo/gris
          else if (
            invoiceType === InvoiceType.FACTURA &&
            hasCash &&
            !hasOtherMethods
          ) {
            boletaCellColor = 'FFA9A9A9'; // Color plomo/gris (Dark Gray)
          }
          // Boleta con pago NO efectivo (tarjeta, transferencia, yape, plin) -> celeste
          else if (
            invoiceType === InvoiceType.BOLETA &&
            !hasCash &&
            hasOtherMethods
          ) {
            boletaCellColor = 'FF87CEEB'; // Color celeste (Sky Blue)
          }
          // Boleta con pago efectivo -> verde
          else if (
            invoiceType === InvoiceType.BOLETA &&
            hasCash &&
            !hasOtherMethods
          ) {
            boletaCellColor = 'FF90EE90'; // Color verde claro
          }
        }

        // OBS vacío por ahora
        const obs = '';

        // POS: Agrupar y contar descripciones de folio charges que NO sean de tipo ROOM
        const posItemsMap = new Map<string, number>();
        for (const folio of reservation.folios) {
          for (const charge of folio.folioCharges || []) {
            if (charge.chargeType !== ChargeType.ROOM) {
              const description = charge.description;
              posItemsMap.set(
                description,
                (posItemsMap.get(description) || 0) + 1,
              );
            }
          }
        }

        // Formatear como "2 uni Gaseosa Inka Kola" o simplemente "Gaseosa Inka Kola" si es 1
        const posDescriptions: string[] = [];
        for (const [description, count] of posItemsMap.entries()) {
          if (count > 1) {
            posDescriptions.push(`${count} uds ${description}`);
          } else {
            posDescriptions.push(description);
          }
        }
        const pos = posDescriptions.join(' | ');

        // Asignar valores a las celdas
        const rowData = [
          fechaFormat,
          checkInHour,
          checkOutHour,
          documento,
          nombres,
          habitacion,
          metodoPago,
          monto,
          ruc,
          empresa,
          boleta,
          obs,
          pos,
        ];

        rowData.forEach((value, idx) => {
          const cell = dataRow.getCell(idx + 1);
          cell.value = value;
          cell.alignment = {
            vertical: 'middle',
            horizontal: idx === 7 ? 'right' : 'left',
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };

          // Formato de número para monto
          if (idx === 7) {
            cell.numFmt = '#,##0.00';
          }

          // Aplicar color de fondo a la celda de nombres (índice 4) basado en métodos de pago
          if (idx === 4 && nombresCellColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: nombresCellColor },
            };
          }

          // Aplicar color de fondo a la celda de boleta (índice 10) basado en tipo de invoice y métodos de pago
          if (idx === 10 && boletaCellColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: boletaCellColor },
            };
          }
        });

        dataRow.height = 20;
        currentRow++;
      }

      // Agregar fila de total del día
      const totalRow = worksheet.getRow(currentRow);

      // Merge cells A-G para "TOTAL"
      worksheet.mergeCells(currentRow, 1, currentRow, 7);
      const totalLabelCell = totalRow.getCell(1);
      totalLabelCell.value = 'TOTAL';
      totalLabelCell.font = { bold: true, size: 11 };
      totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalLabelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E6E6' },
      };

      // Celda del monto total (H)
      const totalAmountCell = totalRow.getCell(8);
      totalAmountCell.value = dayTotal;
      totalAmountCell.font = { bold: true, size: 11 };
      totalAmountCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalAmountCell.numFmt = '#,##0.00';
      totalAmountCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7E6E6' },
      };

      // Aplicar bordes a la fila de total y extender el color gris hasta la columna M
      for (let col = 1; col <= 13; col++) {
        const cell = totalRow.getCell(col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
        // Aplicar color gris a todas las columnas de la fila de total (A-M)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE7E6E6' },
        };
      }

      totalRow.height = 22;
      currentRow++;

      // Agregar una fila vacía entre días
      currentRow++;
    }

    // Generar el archivo Excel como buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as ExcelJS.Buffer;
  } 

  /**
   * Generates a unique folio number in format: FOL-YYYY-XXXXX
   * @param queryRunner - QueryRunner instance for transaction context
   * @param tenantId - Tenant ID for scoping
   * @returns Generated folio number
   */
  private async generateFolioNumber(
    queryRunner: ReturnType<DataSource['createQueryRunner']>,
    tenantId: number,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const folioCount = await queryRunner.manager.count(Folio, {
      where: { tenantId },
    });
    return `FOL-${year}-${String(folioCount + 1).padStart(5, '0')}`;
  }
}
