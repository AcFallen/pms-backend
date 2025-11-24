import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { InvoiceType } from '../enums/invoice-type.enum';
import { CustomerDocumentType } from '../enums/customer-document-type.enum';

export class GenerateInvoiceWithoutSunatDto {
  @ApiProperty({
    description: 'Folio public UUID to generate invoice from',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  folioPublicId: string;

  @ApiProperty({
    description: 'Type of invoice to generate (Boleta or Factura)',
    enum: InvoiceType,
    example: InvoiceType.FACTURA,
  })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiProperty({
    description:
      'Customer document type (optional, auto-filled from guest if not provided)',
    enum: CustomerDocumentType,
    example: CustomerDocumentType.RUC,
    required: false,
  })
  @IsEnum(CustomerDocumentType)
  @IsOptional()
  customerDocumentType?: CustomerDocumentType;

  @ApiProperty({
    description:
      'Customer document number (optional, auto-filled from guest if not provided)',
    example: '20123456789',
    required: false,
  })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  customerDocumentNumber?: string;

  @ApiProperty({
    description:
      'Customer name (optional, auto-filled from guest if not provided)',
    example: 'EMPRESA ABC SAC',
    required: false,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  customerName?: string;

  @ApiProperty({
    description:
      'Customer address (optional, auto-filled from guest if not provided)',
    example: 'CALLE LOS PINOS 123 LIMA',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerAddress?: string;

  @ApiProperty({
    description: 'Customer email for invoice (optional)',
    example: 'cliente@correo.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;
}
