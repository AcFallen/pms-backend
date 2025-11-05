import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  Min,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceType } from '../enums/invoice-type.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { CustomerDocumentType } from '../enums/customer-document-type.enum';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Folio ID associated with this invoice',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  folioId: number;

  @ApiProperty({
    description: 'Type of invoice',
    enum: InvoiceType,
    example: InvoiceType.BOLETA,
  })
  @IsEnum(InvoiceType)
  @IsNotEmpty()
  invoiceType: InvoiceType;

  @ApiProperty({
    description: 'Invoice series',
    example: 'B001',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  series: string;

  @ApiProperty({
    description: 'Invoice number',
    example: '00000001',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @ApiProperty({
    description: 'Full invoice number (series-number)',
    example: 'B001-00000001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  fullNumber: string;

  @ApiProperty({
    description: 'Customer document type',
    enum: CustomerDocumentType,
    example: CustomerDocumentType.DNI,
  })
  @IsEnum(CustomerDocumentType)
  @IsNotEmpty()
  customerDocumentType: CustomerDocumentType;

  @ApiProperty({
    description: 'Customer document number',
    example: '12345678',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  customerDocumentNumber: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'Juan Pérez García',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  customerName: string;

  @ApiProperty({
    description: 'Customer address',
    example: 'Av. Principal 123, Lima',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerAddress?: string;

  @ApiProperty({
    description: 'Subtotal amount (before tax)',
    example: 100.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  subtotal: number;

  @ApiProperty({
    description: 'IGV amount (18%)',
    example: 18.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  igv: number;

  @ApiProperty({
    description: 'Total amount (subtotal + IGV)',
    example: 118.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotEmpty()
  total: number;

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
    required: false,
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiProperty({
    description: 'SUNAT CDR (Constancia de Recepción)',
    required: false,
  })
  @IsString()
  @IsOptional()
  sunatCdr?: string;

  @ApiProperty({
    description: 'SUNAT response',
    required: false,
  })
  @IsString()
  @IsOptional()
  sunatResponse?: string;

  @ApiProperty({
    description: 'XML content',
    required: false,
  })
  @IsString()
  @IsOptional()
  xmlContent?: string;

  @ApiProperty({
    description: 'PDF URL',
    example: 'https://example.com/invoices/B001-00000001.pdf',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  pdfUrl?: string;

  @ApiProperty({
    description: 'Invoice issue date',
    example: '2025-11-05',
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  issueDate: Date;

  @ApiProperty({
    description: 'Date when invoice was sent to SUNAT',
    example: '2025-11-05T12:00:00Z',
    required: false,
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  sentAt?: Date;

  @ApiProperty({
    description: 'Date when invoice was accepted by SUNAT',
    example: '2025-11-05T12:05:00Z',
    required: false,
    type: String,
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  acceptedAt?: Date;
}
