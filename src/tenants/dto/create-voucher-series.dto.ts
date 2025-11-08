import {
  IsEnum,
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  Length,
  Min,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType } from '../enums/voucher-type.enum';

export class CreateVoucherSeriesDto {
  @ApiProperty({
    description: 'Tipo de comprobante SUNAT',
    enum: VoucherType,
    example: VoucherType.FACTURA,
  })
  @IsEnum(VoucherType)
  voucherType: VoucherType;

  @ApiProperty({
    description: 'Serie del comprobante (4 caracteres alfanuméricos)',
    example: 'F001',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @Length(4, 4, { message: 'La serie debe tener exactamente 4 caracteres' })
  @Matches(/^[A-Z0-9]{4}$/, {
    message: 'La serie debe contener solo letras mayúsculas y números',
  })
  series: string;

  @ApiPropertyOptional({
    description: 'Número inicial del correlativo',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'El número inicial debe ser mayor a 0' })
  currentNumber?: number;

  @ApiPropertyOptional({
    description: 'Si esta serie está activa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Si es la serie por defecto para este tipo de comprobante',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Descripción o uso de esta serie',
    example: 'Serie principal para facturación',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Punto de emisión o ubicación',
    example: 'Recepción - Lima',
  })
  @IsOptional()
  @IsString()
  emissionPoint?: string;
}
