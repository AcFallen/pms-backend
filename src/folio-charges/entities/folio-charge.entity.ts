import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Generated,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ChargeType } from '../enums/charge-type.enum';
import { Folio } from '../../folios/entities/folio.entity';

@Entity('folio_charges')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'folioId'])
@Index(['tenantId', 'chargeDate'])
export class FolioCharge {
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
  folioId: number;

  @ManyToOne(() => Folio)
  @JoinColumn({ name: 'folioId' })
  folio: Folio;

  @Column({
    type: 'enum',
    enum: ChargeType,
    nullable: false,
  })
  chargeType: ChargeType;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false, default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  total: number;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  chargeDate: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
