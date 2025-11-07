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
import { ProductCategory } from '../../product-categories/entities/product-category.entity';

@Entity('products')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'sku'], { unique: true })
@Index(['tenantId', 'categoryId', 'isActive'])
@Index(['tenantId', 'name'])
export class Product {
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
  categoryId: number;

  @ManyToOne(() => ProductCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ProductCategory;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: string | null;

  @Column({ type: 'int', nullable: false, default: 0 })
  stock: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  minStock: number;

  @Column({ type: 'boolean', nullable: false, default: true })
  trackInventory: boolean;

  @Column({ type: 'boolean', nullable: false, default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
