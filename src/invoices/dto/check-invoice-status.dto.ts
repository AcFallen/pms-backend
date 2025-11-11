import { ApiProperty } from '@nestjs/swagger';

export class CheckInvoiceStatusResponseDto {
  @ApiProperty({
    description: 'Invoice type (1=Factura, 3=Boleta)',
    example: 1,
  })
  tipo_de_comprobante: number;

  @ApiProperty({
    description: 'Invoice series',
    example: 'FFF1',
  })
  serie: string;

  @ApiProperty({
    description: 'Invoice number',
    example: 1,
  })
  numero: number;

  @ApiProperty({
    description: 'Link to the voucher in Nubefact',
    example: 'https://www.nubefact.com/cpe/d268f882-4554-a403c6712e6',
  })
  enlace: string;

  @ApiProperty({
    description: 'PDF link',
    example: 'https://www.nubefact.com/pdf/...',
    required: false,
  })
  enlace_del_pdf?: string;

  @ApiProperty({
    description: 'XML link',
    example: 'https://www.nubefact.com/xml/...',
    required: false,
  })
  enlace_del_xml?: string;

  @ApiProperty({
    description: 'CDR link',
    example: 'https://www.nubefact.com/cdr/...',
    required: false,
  })
  enlace_del_cdr?: string;

  @ApiProperty({
    description: 'Whether SUNAT accepted the invoice',
    example: true,
  })
  aceptada_por_sunat: boolean;

  @ApiProperty({
    description: 'SUNAT description message',
    example: 'La Factura numero FFF1-1, ha sido aceptada',
  })
  sunat_description: string;

  @ApiProperty({
    description: 'SUNAT note',
    example: null,
    required: false,
  })
  sunat_note?: string;

  @ApiProperty({
    description: 'SUNAT response code',
    example: '0',
  })
  sunat_responsecode: string;

  @ApiProperty({
    description: 'SUNAT SOAP error',
    example: '',
    required: false,
  })
  sunat_soap_error?: string;

  @ApiProperty({
    description: 'Whether the invoice is cancelled',
    example: false,
  })
  anulado: boolean;

  @ApiProperty({
    description: 'String for QR code',
    example: '20600695771 | 01 | FFF1 | 000001 | ...',
    required: false,
  })
  cadena_para_codigo_qr?: string;

  @ApiProperty({
    description: 'Hash code',
    example: 'xMLFMnbgp1/bHEy572RKRTE9hPY=',
    required: false,
  })
  codigo_hash?: string;

  @ApiProperty({
    description: 'Updated invoice status in the system',
    example: 'accepted',
  })
  invoiceStatus: string;
}
