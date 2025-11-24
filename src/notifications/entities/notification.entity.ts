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
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('notifications')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'userId', 'status'])
@Index(['tenantId', 'createdAt'])
export class Notification {
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
  userId: number;

  @Column({
    type: 'enum',
    enum: NotificationType,
    nullable: false,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    nullable: false,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    reservationPublicId?: string;
    reservationCode?: string;
    roomNumber?: string;
    guestName?: string;
    checkOutTime?: string;
  } | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Exclude()
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Exclude()
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
