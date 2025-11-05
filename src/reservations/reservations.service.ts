import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation } from './entities/reservation.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
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

    const reservation = this.reservationRepository.create({
      ...createReservationDto,
      tenantId,
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
}
