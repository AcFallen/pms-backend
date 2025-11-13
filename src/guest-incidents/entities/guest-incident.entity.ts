import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Generated,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Guest } from '../../guests/entities/guest.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { User } from '../../users/entities/user.entity';
import { IncidentSeverity } from '../enums/incident-severity.enum';
import { IncidentType } from '../enums/incident-type.enum';

@Entity('guest_incidents')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'guestId'])
@Index(['tenantId', 'reservationId'])
@Index(['tenantId', 'severity'])
@Index(['tenantId', 'createdAt'])
export class GuestIncident {
  @Exclude()
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;

  @Column({ type: 'uuid', unique: true, nullable: false })
  @Generated('uuid')
  publicId: string;

  @Exclude()
  @Column({ type: 'int', nullable: false })
  tenantId: number;

  // Relación con el huésped (OBLIGATORIO - clave del historial)
  @Column({ type: 'int', nullable: false })
  guestId: number;

  @ManyToOne(() => Guest)
  @JoinColumn({ name: 'guestId' })
  guest: Guest;

  // Relación con la reserva (OBLIGATORIO - contexto de la incidencia)
  @Column({ type: 'int', nullable: false })
  reservationId: number;

  @ManyToOne(() => Reservation)
  @JoinColumn({ name: 'reservationId' })
  reservation: Reservation;

  // Usuario que reportó la incidencia (staff)
  @Column({ type: 'int', nullable: false })
  reportedByUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reportedByUserId' })
  reportedByUser: User;

  // Tipo de incidencia
  @Column({ type: 'enum', enum: IncidentType, nullable: false })
  type: IncidentType;

  // Severidad de la incidencia
  @Column({ type: 'enum', enum: IncidentSeverity, nullable: false })
  severity: IncidentSeverity;

  // Título corto de la incidencia
  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  // Descripción detallada
  @Column({ type: 'text', nullable: false })
  description: string;

  // Fecha en que ocurrió la incidencia
  @Column({ type: 'timestamptz', nullable: false })
  incidentDate: Date;

  // ¿La incidencia está resuelta?
  @Column({ type: 'boolean', default: false })
  isResolved: boolean;

  // Notas de resolución (si aplica)
  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  // Usuario que resolvió la incidencia
  @Column({ type: 'int', nullable: true })
  resolvedByUserId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolvedByUserId' })
  resolvedByUser: User | null;

  // Fecha de resolución
  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  // ¿Prohibir futuras reservas? (para casos muy graves)
  @Column({ type: 'boolean', default: false })
  blockFutureBookings: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
