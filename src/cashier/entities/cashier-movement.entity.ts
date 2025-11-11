import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { CashierSession } from './cashier.entity';

export enum CashierMovementType {
  CASH_IN = 'cash_in', // Entrada de efectivo (ej: cambio traído)
  CASH_OUT = 'cash_out', // Salida de efectivo (ej: compras, gastos, retiro de seguridad)
}

@Entity('cashier_movements')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'cashierSessionId'])
export class CashierMovement {
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
  cashierSessionId: number;

  @Exclude()
  @Column({ type: 'int', nullable: false })
  createdBy: number; // User ID que registró el movimiento

  @Column({
    type: 'enum',
    enum: CashierMovementType,
  })
  type: CashierMovementType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text' })
  reason: string; // Razón del movimiento

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  movementDate: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  // Relations
  @Exclude()
  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Exclude()
  @ManyToOne(() => CashierSession, { nullable: false })
  @JoinColumn({ name: 'cashierSessionId' })
  cashierSession: CashierSession;

  @Exclude()
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;
}
