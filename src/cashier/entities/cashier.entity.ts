import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';

export enum CashierSessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('cashier_sessions')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'openedBy'])
export class CashierSession {
  @Exclude()
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;

  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;

  @Exclude()
  @Column({ type: 'int', nullable: false })
  tenantId: number;

  @Exclude()
  @Column({ type: 'int', nullable: false })
  openedBy: number; // User ID que abrió la caja

  @Exclude()
  @Column({ type: 'int', nullable: true })
  closedBy: number; // User ID que cerró la caja

  @Column({
    type: 'enum',
    enum: CashierSessionStatus,
    default: CashierSessionStatus.OPEN,
  })
  status: CashierSessionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  openingAmount: number; // Monto inicial en caja

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  expectedAmount: number; // Monto esperado por el sistema (calculado)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  countedAmount: number; // Monto contado real al cerrar

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  difference: number; // Diferencia entre contado y esperado

  @Column({ type: 'text', nullable: true })
  openingNotes: string; // Notas al abrir

  @Column({ type: 'text', nullable: true })
  closingNotes: string; // Notas al cerrar

  @Column({ type: 'timestamptz' })
  openedAt: Date; // Fecha/hora de apertura

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date; // Fecha/hora de cierre

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @Exclude()
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Exclude()
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'openedBy' })
  openedByUser: User;

  @Exclude()
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'closedBy' })
  closedByUser: User;
}
