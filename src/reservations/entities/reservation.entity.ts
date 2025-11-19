import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Generated,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Guest } from '../../guests/entities/guest.entity';
import { Room } from '../../rooms/entities/room.entity';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { Folio } from '../../folios/entities/folio.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { ReservationSource } from '../enums/reservation-source.enum';
import { VehicleType } from '../enums/vehicle-type.enum';

@Entity('reservations')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'reservationCode'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'checkInDate', 'checkOutDate'])
@Index(['tenantId', 'guestId'])
@Index(['tenantId', 'roomId'])
@Index(['tenantId', 'checkInDate', 'status'])
export class Reservation {
  @Exclude()
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;

  @Column({ type: 'uuid', unique: true, nullable: false })
  @Generated('uuid')
  publicId: string;

  @Exclude()
  @Column({ type: 'int', nullable: false })
  tenantId: number;

  @Exclude()
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'int', nullable: false })
  guestId: number;

  @ManyToOne(() => Guest)
  @JoinColumn({ name: 'guestId' })
  guest: Guest;

  @Column({ type: 'int', nullable: true })
  roomId: number | null;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room | null;

  @Column({ type: 'int', nullable: false })
  roomTypeId: number;

  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;

  @OneToMany(() => Folio, (folio) => folio.reservation)
  folios: Folio[];

  @Column({ type: 'varchar', length: 20, unique: true, nullable: false })
  reservationCode: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    nullable: false,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({
    type: 'enum',
    enum: ReservationSource,
    nullable: false,
    default: ReservationSource.DIRECT,
  })
  source: ReservationSource;

  @Column({ type: 'date', nullable: false })
  checkInDate: Date;

  @Column({ type: 'date', nullable: false })
  checkOutDate: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Timestamp real de check-in (cuando el huésped entra)',
  })
  checkInTime: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Timestamp real de check-out (cuando el huésped sale)',
  })
  checkOutTime: Date | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Número de noches (calculado o manual)',
  })
  nights: number | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Número de horas (solo si el tenant cobra por hora)',
  })
  hours: number | null;

  @Column({ type: 'int', nullable: false, default: 1 })
  adults: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  children: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment:
      'Tarifa aplicada (por noche, por hora, o precio fijo según configuración del tenant)',
  })
  appliedRate: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'Monto total de la reserva',
  })
  totalAmount: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    comment: 'Indica si la reserva incluye uso de cochera/garage',
  })
  hasGarage: boolean;

  @Column({
    type: 'enum',
    enum: VehicleType,
    nullable: true,
    comment: 'Tipo de vehículo (CAR o MOTORCYCLE) si hasGarage es true',
  })
  vehicleType: VehicleType | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
