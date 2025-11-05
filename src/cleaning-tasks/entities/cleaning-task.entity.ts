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
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskType } from '../enums/task-type.enum';

@Entity('cleaning_tasks')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'status', 'priority'])
@Index(['tenantId', 'roomId', 'status'])
@Index(['tenantId', 'assignedTo', 'status'])
@Index(['tenantId', 'createdAt'])
export class CleaningTask {
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
  roomId: number;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'int', nullable: true })
  assignedTo: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedTo' })
  assignedUser: User | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    nullable: false,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    nullable: false,
    default: TaskPriority.NORMAL,
  })
  priority: TaskPriority;

  @Column({
    type: 'enum',
    enum: TaskType,
    nullable: false,
    default: TaskType.CHECKOUT,
  })
  taskType: TaskType;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
