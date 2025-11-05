import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Generated,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { RoomStatus } from '../enums/room-status.enum';
import { CleaningStatus } from '../enums/cleaning-status.enum';

@Entity('rooms')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'roomNumber'], { unique: true })
@Index(['tenantId', 'status', 'cleaningStatus'])
@Index(['tenantId', 'roomTypeId'])
export class Room {
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
  roomTypeId: number;

  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;

  @Column({ type: 'varchar', length: 20, nullable: false })
  roomNumber: string;

  @Column({ type: 'int', nullable: true })
  floor: number | null;

  @Column({ type: 'enum', enum: RoomStatus, nullable: false, default: RoomStatus.AVAILABLE })
  status: RoomStatus;

  @Column({ type: 'enum', enum: CleaningStatus, nullable: false, default: CleaningStatus.CLEAN })
  cleaningStatus: CleaningStatus;

  @Column({ type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
