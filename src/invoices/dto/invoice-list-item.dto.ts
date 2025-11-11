import { ApiProperty } from '@nestjs/swagger';
import { InvoiceType } from '../enums/invoice-type.enum';
import { CustomerDocumentType } from '../enums/customer-document-type.enum';
import { InvoiceStatus } from '../enums/invoice-status.enum';

export class InvoiceListItemDto {
  @ApiProperty({
    description: 'Invoice public UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  publicId: string;

  @ApiProperty({
    description: 'Full invoice number (series-number)',
    example: 'B001-00000001',
  })
  fullNumber: string;

  @ApiProperty({
    description: 'Invoice type',
    enum: InvoiceType,
    example: InvoiceType.BOLETA,
  })
  invoiceType: InvoiceType;

  @ApiProperty({
    description: 'Customer document type',
    enum: CustomerDocumentType,
    example: CustomerDocumentType.DNI,
  })
  customerDocumentType: CustomerDocumentType;

  @ApiProperty({
    description: 'Customer document number',
    example: '12345678',
  })
  customerDocumentNumber: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'JOHN DOE',
  })
  customerName: string;

  @ApiProperty({
    description: 'Invoice total amount',
    example: 236.0,
  })
  total: number;

  @ApiProperty({
    description: 'Invoice status',
    enum: InvoiceStatus,
    example: InvoiceStatus.ACCEPTED,
  })
  status: InvoiceStatus;

  @ApiProperty({
    description: 'Issue date',
    example: '2025-11-10T10:00:00Z',
  })
  issueDate: Date;

  @ApiProperty({
    description: 'PDF URL from SUNAT',
    example: 'https://nubefact.com/pdf/...',
    nullable: true,
  })
  pdfUrl: string | null;

  @ApiProperty({
    description: 'Folio number associated with this invoice',
    example: 'FOL-2025-00001',
  })
  folioNumber: string;
}
