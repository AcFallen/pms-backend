import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterCalendarReservationsDto } from './dto/filter-calendar-reservations.dto';
import { CalendarReservationResponseDto } from './dto/calendar-reservation-response.dto';
import { Reservation } from './entities/reservation.entity';
import { Room } from '../rooms/entities/room.entity';
import { Guest } from '../guests/entities/guest.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { Folio } from '../folios/entities/folio.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CleaningTask } from '../cleaning-tasks/entities/cleaning-task.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { RoomStatus } from '../rooms/enums/room-status.enum';
import { CleaningStatus } from '../rooms/enums/cleaning-status.enum';
import { FolioStatus } from '../folios/enums/folio-status.enum';
import { ReservationSource } from './enums/reservation-source.enum';
import { TaskStatus } from '../cleaning-tasks/enums/task-status.enum';
import { TaskPriority } from '../cleaning-tasks/enums/task-priority.enum';
import { TaskType } from '../cleaning-tasks/enums/task-type.enum';
import { CheckoutReservationDto } from './dto/checkout-reservation.dto';

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
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
    tenantId: number,
  ): Promise<Reservation> {
    // Check if reservation code already exists
    const existingReservation = await this.reservationRepository.findOne({
      where: {
        reservationCode: createReservationDto.reservationCode,
        tenantId,
      },
    });
    if (existingReservation) {
      throw new ConflictException(
        `Reservation code ${createReservationDto.reservationCode} already exists`,
      );
    }

    // Resolve guest publicId to internal ID
    const guest = await this.guestRepository.findOne({
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
    const roomType = await this.roomTypeRepository.findOne({
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
    if (createReservationDto.roomPublicId) {
      const room = await this.roomRepository.findOne({
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

    // Calculate nights if not provided
    let nights = createReservationDto.nights;
    if (!nights) {
      const checkIn = new Date(createReservationDto.checkInDate);
      const checkOut = new Date(createReservationDto.checkOutDate);
      const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
      nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const reservation = this.reservationRepository.create({
      reservationCode: createReservationDto.reservationCode,
      status: createReservationDto.status,
      source: createReservationDto.source,
      checkInDate: createReservationDto.checkInDate,
      checkOutDate: createReservationDto.checkOutDate,
      checkInTime: createReservationDto.status === ReservationStatus.CHECKED_IN ? new Date() : null,
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

    const savedReservation = await this.reservationRepository.save(reservation);

    // Update room status to OCCUPIED if checking in with assigned room
    if (savedReservation.status === ReservationStatus.CHECKED_IN && roomId) {
      await this.roomRepository.update(
        { id: roomId, tenantId },
        { status: RoomStatus.OCCUPIED },
      );
    }

    return savedReservation;
  }

  async findAll(tenantId: number): Promise<Reservation[]> {
    return await this.reservationRepository.find({
      where: { tenantId },
      relations: ['guest', 'room', 'roomType'],
      order: { checkInDate: 'DESC', createdAt: 'DESC' },
    });
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

  async findByPublicId(
    publicId: string,
    tenantId: number,
  ): Promise<any> {
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
      .addSelect([
        'room.publicId',
        'room.roomNumber',
      ])
      .leftJoin('reservation.roomType', 'roomType')
      .addSelect([
        'roomType.publicId',
        'roomType.name',
        'roomType.description',
      ])
      .leftJoin('reservation.folios', 'folio')
      .addSelect([
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
      // Exclude cancelled reservations from calendar
      .andWhere('reservation.status != :cancelledStatus', {
        cancelledStatus: ReservationStatus.CANCELLED,
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
      cleaningTask.notes = `Checkout cleaning for reservation ${reservation.reservationCode}. Guest: ${reservation.guest?.firstName || ''} ${reservation.guest?.lastName || ''}`.trim();

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
}
