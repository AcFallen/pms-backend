import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product category ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({
    description: 'Product name',
    example: 'Coca Cola 500ml',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Refresco de cola sabor original',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'SKU (Stock Keeping Unit)',
    example: 'BEB-COC-500',
    maxLength: 50,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @ApiProperty({
    description: 'Product price',
    example: '5.50',
  })
  @IsNotEmpty()
  price: string;

  @ApiProperty({
    description: 'Product cost',
    example: '3.00',
    required: false,
  })
  @IsOptional()
  cost?: string;

  @ApiProperty({
    description: 'Current stock quantity',
    example: 100,
    default: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @ApiProperty({
    description: 'Minimum stock level for alerts',
    example: 10,
    default: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @ApiProperty({
    description: 'Track inventory for this product',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @ApiProperty({
    description: 'Is product active',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
