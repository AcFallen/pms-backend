import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { FilterCalendarReservationsDto } from './dto/filter-calendar-reservations.dto';
import { Reservation } from './entities/reservation.entity';
import { Room } from '../rooms/entities/room.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { ReservationType } from './enums/reservation-type.enum';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async create(createReservationDto: CreateReservationDto, tenantId: number): Promise<Reservation> {
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

    // Validate reservation type specific fields
    const reservationType = createReservationDto.reservationType || ReservationType.NIGHTLY;

    if (reservationType === ReservationType.HOURLY) {
      // Validate hourly reservation fields
      if (!createReservationDto.hours) {
        throw new BadRequestException('Hours is required for hourly reservations');
      }
      if (!createReservationDto.hourlyStartTime) {
        throw new BadRequestException('Hourly start time is required for hourly reservations');
      }
      if (!createReservationDto.hourlyEndTime) {
        throw new BadRequestException('Hourly end time is required for hourly reservations');
      }
      if (!createReservationDto.ratePerHour) {
        throw new BadRequestException('Rate per hour is required for hourly reservations');
      }
    } else {
      // Validate nightly reservation fields
      if (!createReservationDto.nights) {
        throw new BadRequestException('Nights is required for nightly reservations');
      }
      if (!createReservationDto.ratePerNight) {
        throw new BadRequestException('Rate per night is required for nightly reservations');
      }
    }

    const reservation = this.reservationRepository.create({
      ...createReservationDto,
      tenantId,
      reservationType,
    });
    return await this.reservationRepository.save(reservation);
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

  async findByPublicId(publicId: string, tenantId: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { publicId, tenantId },
      relations: ['guest', 'room', 'roomType'],
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with public ID ${publicId} not found`);
    }
    return reservation;
  }

  async findByReservationCode(reservationCode: string, tenantId: number): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { reservationCode, tenantId },
      relations: ['guest', 'room', 'roomType'],
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with code ${reservationCode} not found`);
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

    Object.assign(reservation, updateReservationDto);
    return await this.reservationRepository.save(reservation);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const reservation = await this.findOne(id, tenantId);
    await this.reservationRepository.remove(reservation);
  }

  async findForCalendar(
    filterDto: FilterCalendarReservationsDto,
    tenantId: number,
  ): Promise<Reservation[]> {
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
      // A reservation overlaps if: checkInDate < endDate AND checkOutDate > startDate
      .andWhere('reservation.checkInDate < :endDate', { endDate })
      .andWhere('reservation.checkOutDate > :startDate', { startDate });

    // Filter by room if provided
    if (roomPublicId) {
      queryBuilder.andWhere('room.publicId = :roomPublicId', { roomPublicId });
    }

    // Order by check-in date
    queryBuilder.orderBy('reservation.checkInDate', 'ASC');

    return await queryBuilder.getMany();
  }
}
