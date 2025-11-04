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
import { User } from '../../users/entities/user.entity';

@Entity('tenants')
@Index(['publicId'], { unique: true })
@Index(['ruc'], { unique: true })
@Index(['status'])
export class Tenant {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
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

  @Column({ type: 'enum', enum: TenantStatus, nullable: false, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  @Column({ type: 'enum', enum: TenantPlan, nullable: false, default: TenantPlan.BASICO })
  plan: TenantPlan;

  @Column({ type: 'int', nullable: false, default: 10 })
  maxRooms: number;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
