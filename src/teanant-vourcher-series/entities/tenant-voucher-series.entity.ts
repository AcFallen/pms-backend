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
import { VoucherType } from '../enums/voucher-type.enum';

@Entity('tenant_voucher_series')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'voucherType', 'series'], { unique: true })
@Index(['tenantId', 'voucherType', 'isDefault'])
@Index(['tenantId', 'isActive'])
export class TenantVoucherSeries {
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

  @Column({
    type: 'enum',
    enum: VoucherType,
    nullable: false,
    comment: 'Tipo de comprobante SUNAT',
  })
  voucherType: VoucherType;

  @Column({
    type: 'varchar',
    length: 4,
    nullable: false,
    comment: 'Serie del comprobante (ej: F001, B001, FC01)',
  })
  series: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 1,
    comment: 'Número correlativo actual',
  })
  currentNumber: number;

  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
    comment: 'Si esta serie está activa para uso',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    comment: 'Si es la serie por defecto para este tipo de comprobante',
  })
  isDefault: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment:
      'Descripción o uso de esta serie (ej: "Serie para ventas mostrador")',
  })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Punto de emisión o ubicación física',
  })
  emissionPoint: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  /**
   * Genera el siguiente número de comprobante y actualiza el correlativo
   * @returns El número completo del comprobante (ej: "F001-00000123")
   */
  getNextVoucherNumber(): string {
    const paddedNumber = String(this.currentNumber).padStart(8, '0');
    return `${this.series}-${paddedNumber}`;
  }

  /**
   * Obtiene el número actual sin incrementar
   * @returns El número completo del comprobante actual
   */
  getCurrentVoucherNumber(): string {
    const paddedNumber = String(this.currentNumber).padStart(8, '0');
    return `${this.series}-${paddedNumber}`;
  }
}
