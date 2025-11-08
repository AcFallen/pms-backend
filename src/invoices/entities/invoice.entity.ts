import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { InvoiceType } from '../enums/invoice-type.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { CustomerDocumentType } from '../enums/customer-document-type.enum';
import { Folio } from '../../folios/entities/folio.entity';
import { TenantVoucherSeries } from '../../teanant-vourcher-series/entities/tenant-voucher-series.entity';

@Entity('invoices')
@Index(['tenantId', 'publicId'], { unique: true })
@Index(['tenantId', 'series', 'number'], { unique: true })
@Index(['tenantId', 'fullNumber'], { unique: true })
@Index(['tenantId', 'folioId'])
@Index(['tenantId', 'voucherSeriesId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'issueDate'])
export class Invoice {
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

  @Column({ type: 'int', nullable: true })
  voucherSeriesId: number | null;

  @ManyToOne(() => TenantVoucherSeries)
  @JoinColumn({ name: 'voucherSeriesId' })
  voucherSeries: TenantVoucherSeries | null;

  @Column({
    type: 'enum',
    enum: InvoiceType,
    nullable: false,
  })
  invoiceType: InvoiceType;

  @Column({ type: 'varchar', length: 10, nullable: false })
  series: string;

  @Column({ type: 'varchar', length: 20, nullable: false })
  number: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  fullNumber: string;

  @Column({
    type: 'enum',
    enum: CustomerDocumentType,
    nullable: false,
  })
  customerDocumentType: CustomerDocumentType;

  @Column({ type: 'varchar', length: 20, nullable: false })
  customerDocumentNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  customerName: string;

  @Column({ type: 'text', nullable: true })
  customerAddress: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  igv: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  total: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    nullable: false,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  @Column({ type: 'text', nullable: true })
  sunatCdr: string | null;

  @Column({ type: 'text', nullable: true })
  sunatResponse: string | null;

  @Column({ type: 'text', nullable: true })
  xmlContent: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'date', nullable: false })
  issueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
