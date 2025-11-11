import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsEnum, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceType } from '../enums/invoice-type.enum';
import { CustomerDocumentType } from '../enums/customer-document-type.enum';

export class FilterInvoicesDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({
    description: 'Filter by invoice type',
    enum: InvoiceType,
    example: InvoiceType.FACTURA,
    required: false,
  })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @ApiProperty({
    description: 'Filter by customer document type',
    enum: CustomerDocumentType,
    example: CustomerDocumentType.DNI,
    required: false,
  })
  @IsOptional()
  @IsEnum(CustomerDocumentType)
  customerDocumentType?: CustomerDocumentType;

  @ApiProperty({
    description: 'Filter by customer document number',
    example: '12345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerDocumentNumber?: string;

  @ApiProperty({
    description: 'Filter by creation date start (YYYY-MM-DD)',
    example: '2025-11-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  createdAtStart?: string;

  @ApiProperty({
    description: 'Filter by creation date end (YYYY-MM-DD)',
    example: '2025-11-30',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  createdAtEnd?: string;
}
