import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { GuestIncident } from './entities/guest-incident.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Guest } from '../guests/entities/guest.entity';
import { CreateGuestIncidentDto } from './dto/create-guest-incident.dto';
import { UpdateGuestIncidentDto } from './dto/update-guest-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import {
  GuestIncidentResponseDto,
  GuestStatusDto,
  FilterGuestIncidentsDto,
} from './dto/guest-incident-response.dto';
import { IncidentSeverity } from './enums/incident-severity.enum';

@Injectable()
export class GuestIncidentsService {
  constructor(
    @InjectRepository(GuestIncident)
    private readonly incidentRepository: Repository<GuestIncident>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
  ) {}

  /**
   * Crear una nueva incidencia asociada a una reserva
   */
  async create(
    dto: CreateGuestIncidentDto,
    tenantId: number,
    userId: number,
  ): Promise<GuestIncident> {
    // 1. Obtener la reserva con el huésped
    const reservation = await this.reservationRepository.findOne({
      where: { publicId: dto.reservationPublicId, tenantId },
      relations: ['guest'],
    });

    if (!reservation) {
      throw new NotFoundException(
        `Reservation with public ID ${dto.reservationPublicId} not found`,
      );
    }

    if (!reservation.guestId) {
      throw new BadRequestException(
        'Reservation must have an associated guest to create an incident',
      );
    }

    // 2. Crear la incidencia asociada al guestId de la reserva
    const incident = this.incidentRepository.create({
      tenantId,
      guestId: reservation.guestId,
      reservationId: reservation.id,
      reportedByUserId: userId,
      type: dto.type,
      severity: dto.severity,
      title: dto.title,
      description: dto.description,
      incidentDate: dto.incidentDate,
      blockFutureBookings: dto.blockFutureBookings || false,
    });

    return await this.incidentRepository.save(incident);
  }

  /**
   * Obtener todas las incidencias con filtros opcionales
   */
  async findAll(
    tenantId: number,
    filters: FilterGuestIncidentsDto,
  ): Promise<GuestIncidentResponseDto[]> {
    const query = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.guest', 'guest')
      .leftJoinAndSelect('incident.reservation', 'reservation')
      .leftJoinAndSelect('incident.reportedByUser', 'reportedByUser')
      .leftJoinAndSelect('incident.resolvedByUser', 'resolvedByUser')
      .where('incident.tenantId = :tenantId', { tenantId });

    // Filtro por huésped
    if (filters.guestPublicId) {
      query.andWhere('guest.publicId = :guestPublicId', {
        guestPublicId: filters.guestPublicId,
      });
    }

    // Filtro por reserva
    if (filters.reservationPublicId) {
      query.andWhere('reservation.publicId = :reservationPublicId', {
        reservationPublicId: filters.reservationPublicId,
      });
    }

    // Filtro por severidad
    if (filters.severity) {
      query.andWhere('incident.severity = :severity', {
        severity: filters.severity,
      });
    }

    // Filtro por tipo
    if (filters.type) {
      query.andWhere('incident.type = :type', { type: filters.type });
    }

    // Filtro por estado de resolución
    if (filters.isResolved !== undefined) {
      query.andWhere('incident.isResolved = :isResolved', {
        isResolved: filters.isResolved,
      });
    }

    // Filtro por rango de fechas
    if (filters.startDate && filters.endDate) {
      query.andWhere('incident.incidentDate BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    query.orderBy('incident.incidentDate', 'DESC');

    const incidents = await query.getMany();

    return this.mapToResponseDto(incidents);
  }

  /**
   * Obtener una incidencia por publicId
   */
  async findOne(
    publicId: string,
    tenantId: number,
  ): Promise<GuestIncidentResponseDto> {
    const incident = await this.incidentRepository.findOne({
      where: { publicId, tenantId },
      relations: ['guest', 'reservation', 'reportedByUser', 'resolvedByUser'],
    });

    if (!incident) {
      throw new NotFoundException(
        `Incident with public ID ${publicId} not found`,
      );
    }

    return this.mapToResponseDto([incident])[0];
  }

  /**
   * Obtener historial completo de incidencias de un huésped
   */
  async getGuestIncidentHistory(
    guestPublicId: string,
    tenantId: number,
  ): Promise<GuestIncidentResponseDto[]> {
    const guest = await this.guestRepository.findOne({
      where: { publicId: guestPublicId, tenantId },
    });

    if (!guest) {
      throw new NotFoundException(
        `Guest with public ID ${guestPublicId} not found`,
      );
    }

    const incidents = await this.incidentRepository.find({
      where: { guestId: guest.id, tenantId },
      relations: ['reservation', 'guest', 'reportedByUser', 'resolvedByUser'],
      order: { incidentDate: 'DESC' },
    });

    return this.mapToResponseDto(incidents);
  }

  /**
   * Verificar el estado de un huésped (para prevenir reservas)
   */
  async checkGuestStatus(
    guestPublicId: string,
    tenantId: number,
  ): Promise<GuestStatusDto> {
    const guest = await this.guestRepository.findOne({
      where: { publicId: guestPublicId, tenantId },
    });

    if (!guest) {
      throw new NotFoundException(
        `Guest with public ID ${guestPublicId} not found`,
      );
    }

    const incidents = await this.incidentRepository.find({
      where: { guestId: guest.id, tenantId },
    });

    const hasBlockedStatus = incidents.some((i) => i.blockFutureBookings);
    const criticalIncidentsCount = incidents.filter(
      (i) => i.severity === IncidentSeverity.CRITICAL,
    ).length;
    const unresolvedIncidentsCount = incidents.filter(
      (i) => !i.isResolved,
    ).length;

    return {
      hasBlockedStatus,
      criticalIncidentsCount,
      unresolvedIncidentsCount,
      totalIncidentsCount: incidents.length,
    };
  }

  /**
   * Actualizar una incidencia
   */
  async update(
    publicId: string,
    dto: UpdateGuestIncidentDto,
    tenantId: number,
  ): Promise<GuestIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!incident) {
      throw new NotFoundException(
        `Incident with public ID ${publicId} not found`,
      );
    }

    // Si se está cambiando la reserva, validar y actualizar el guestId
    if (dto.reservationPublicId) {
      const reservation = await this.reservationRepository.findOne({
        where: { publicId: dto.reservationPublicId, tenantId },
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation with public ID ${dto.reservationPublicId} not found`,
        );
      }

      incident.reservationId = reservation.id;
      incident.guestId = reservation.guestId;
    }

    // Actualizar otros campos
    if (dto.type !== undefined) incident.type = dto.type;
    if (dto.severity !== undefined) incident.severity = dto.severity;
    if (dto.title !== undefined) incident.title = dto.title;
    if (dto.description !== undefined) incident.description = dto.description;
    if (dto.incidentDate !== undefined)
      incident.incidentDate = dto.incidentDate;
    if (dto.blockFutureBookings !== undefined)
      incident.blockFutureBookings = dto.blockFutureBookings;

    return await this.incidentRepository.save(incident);
  }

  /**
   * Marcar una incidencia como resuelta
   */
  async resolve(
    publicId: string,
    dto: ResolveIncidentDto,
    tenantId: number,
    userId: number,
  ): Promise<GuestIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!incident) {
      throw new NotFoundException(
        `Incident with public ID ${publicId} not found`,
      );
    }

    if (incident.isResolved) {
      throw new BadRequestException('Incident is already resolved');
    }

    incident.isResolved = true;
    incident.resolutionNotes = dto.resolutionNotes;
    incident.resolvedByUserId = userId;
    incident.resolvedAt = new Date();

    return await this.incidentRepository.save(incident);
  }

  /**
   * Reabrir una incidencia resuelta
   */
  async reopen(publicId: string, tenantId: number): Promise<GuestIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!incident) {
      throw new NotFoundException(
        `Incident with public ID ${publicId} not found`,
      );
    }

    if (!incident.isResolved) {
      throw new BadRequestException('Incident is not resolved');
    }

    incident.isResolved = false;
    incident.resolutionNotes = null;
    incident.resolvedByUserId = null;
    incident.resolvedAt = null;

    return await this.incidentRepository.save(incident);
  }

  /**
   * Eliminar una incidencia (soft delete si lo implementas)
   */
  async remove(publicId: string, tenantId: number): Promise<void> {
    const incident = await this.incidentRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!incident) {
      throw new NotFoundException(
        `Incident with public ID ${publicId} not found`,
      );
    }

    await this.incidentRepository.remove(incident);
  }

  /**
   * Mapear entidades a DTOs de respuesta
   */
  private mapToResponseDto(
    incidents: GuestIncident[],
  ): GuestIncidentResponseDto[] {
    return incidents.map((incident) => ({
      publicId: incident.publicId,
      guestPublicId: incident.guest.publicId,
      guestName: `${incident.guest.firstName} ${incident.guest.lastName}`,
      reservationCode: incident.reservation.reservationCode,
      type: incident.type,
      severity: incident.severity,
      title: incident.title,
      description: incident.description,
      incidentDate: incident.incidentDate,
      isResolved: incident.isResolved,
      resolutionNotes: incident.resolutionNotes,
      resolvedAt: incident.resolvedAt,
      blockFutureBookings: incident.blockFutureBookings,
      reportedByUserName: `${incident.reportedByUser.firstName} ${incident.reportedByUser.lastName}`,
      resolvedByUserName: incident.resolvedByUser
        ? `${incident.resolvedByUser.firstName} ${incident.resolvedByUser.lastName}`
        : null,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
    }));
  }
}
