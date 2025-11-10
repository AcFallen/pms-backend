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
import { PaymentMethod } from '../enums/payment-method.enum';
import { Folio } from '../../folios/entities/folio.entity';

@Entity('payments')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'folioId'])
@Index(['tenantId', 'paymentDate'])
@Index(['tenantId', 'paymentMethod'])
export class Payment {
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
    enum: PaymentMethod,
    nullable: false,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({
    type: 'timestamptz',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  paymentDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
