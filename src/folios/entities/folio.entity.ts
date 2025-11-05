import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Generated,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { FolioStatus } from '../enums/folio-status.enum';

@Entity('folios')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'folioNumber'], { unique: true })
@Index(['tenantId', 'reservationId'])
@Index(['tenantId', 'status'])
export class Folio {
  @Exclude()
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;

  @Column({ type: 'uuid', unique: true, nullable: false })
  @Generated('uuid')
  publicId: string;

  @Exclude()
  @Column({ type: 'int', nullable: false })
  tenantId: number;

  @Column({ type: 'int', nullable: false })
  reservationId: number;

  @Column({ type: 'varchar', length: 20, nullable: false, unique: true })
  folioNumber: string;

  @Column({
    type: 'enum',
    enum: FolioStatus,
    nullable: false,
    default: FolioStatus.OPEN,
  })
  status: FolioStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false, default: 0 })
  balance: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
