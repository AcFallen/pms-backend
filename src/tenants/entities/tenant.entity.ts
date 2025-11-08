import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Generated,
  OneToMany,
} from 'typeorm';
import { TenantStatus } from '../enums/tenant-status.enum';
import { TenantPlan } from '../enums/tenant-plan.enum';
import { BillingMode } from '../enums/billing-mode.enum';
import { CheckoutPolicy } from '../enums/checkout-policy.enum';
import { User } from '../../users/entities/user.entity';
import { Exclude } from 'class-transformer';

@Entity('tenants')
@Index(['publicId'], { unique: true })
@Index(['ruc'], { unique: true })
@Index(['status'])
export class Tenant {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  @Exclude()
  id: number;

  @Column({ type: 'uuid', unique: true, nullable: false })
  @Generated('uuid')
  publicId: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 11, unique: true, nullable: true })
  ruc: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    nullable: false,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    nullable: false,
    default: TenantPlan.BASICO,
  })
  plan: TenantPlan;

  @Column({ type: 'int', nullable: false, default: 10 })
  maxRooms: number;

  // Configuraciones de facturación y checkout
  @Column({
    type: 'enum',
    enum: BillingMode,
    nullable: false,
    default: BillingMode.FIXED_PRICE,
    comment: 'Modo de cobro: FIXED_PRICE (usa basePrice del room type) o MINIMUM_PRICE (usa minimumPrice del room type)',
  })
  billingMode: BillingMode;

  @Column({
    type: 'enum',
    enum: CheckoutPolicy,
    nullable: false,
    default: CheckoutPolicy.FIXED_TIME,
    comment: 'Política de checkout: hora fija o 24h flexibles desde check-in',
  })
  checkoutPolicy: CheckoutPolicy;

  @Column({
    type: 'time',
    nullable: true,
    default: '12:00:00',
    comment: 'Hora de checkout (solo si checkoutPolicy es FIXED_TIME)',
  })
  checkoutTime: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: '0.00',
    comment: 'Cargo adicional por checkout tardío',
  })
  lateCheckoutFee: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logoFileName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  logoMimeType: string | null;

  @Column({ type: 'int', nullable: true })
  logoFileSize: number | null;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
