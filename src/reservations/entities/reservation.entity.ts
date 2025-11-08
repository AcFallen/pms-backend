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
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Guest } from '../../guests/entities/guest.entity';
import { Room } from '../../rooms/entities/room.entity';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { ReservationSource } from '../enums/reservation-source.enum';
import { ReservationType } from '../enums/reservation-type.enum';

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

  @Column({
    type: 'enum',
    enum: ReservationType,
    nullable: false,
    default: ReservationType.NIGHTLY,
  })
  reservationType: ReservationType;

  @Column({ type: 'date', nullable: false })
  checkInDate: Date;

  @Column({ type: 'date', nullable: false })
  checkOutDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkInTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  checkOutTime: Date | null;

  @Column({ type: 'int', nullable: false })
  nights: number;

  @Column({ type: 'int', nullable: true })
  hours: number | null;

  @Column({ type: 'timestamp', nullable: true })
  hourlyStartTime: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  hourlyEndTime: Date | null;

  @Column({ type: 'int', nullable: false, default: 1 })
  adults: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  children: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  ratePerNight: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ratePerHour: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  totalAmount: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
