import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '../enums/tenant-status.enum';
import { TenantPlan } from '../enums/tenant-plan.enum';

export class CreateTenantDto {
  @ApiProperty({
    description: 'Tenant name',
    example: 'Hotel Paradise',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'RUC (Registro Único de Contribuyentes)',
    example: '20123456789',
    maxLength: 11,
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(11, 11)
  ruc?: string;

  @ApiProperty({
    description: 'Business name',
    example: 'Hotel Paradise S.A.C.',
    maxLength: 255,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  businessName?: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'contact@hotelparadise.com',
    maxLength: 255,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    description: 'Contact phone',
    example: '+51987654321',
    maxLength: 20,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: 'Address',
    example: 'Av. Principal 123',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'District',
    example: 'Miraflores',
    maxLength: 100,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  district?: string;

  @ApiProperty({
    description: 'Province',
    example: 'Lima',
    maxLength: 100,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @ApiProperty({
    description: 'Department',
    example: 'Lima',
    maxLength: 100,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  department?: string;

  @ApiProperty({
    description: 'Tenant status',
    enum: TenantStatus,
    example: TenantStatus.ACTIVE,
    default: TenantStatus.ACTIVE,
    required: false,
  })
  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @ApiProperty({
    description: 'Subscription plan',
    enum: TenantPlan,
    example: TenantPlan.BASICO,
    default: TenantPlan.BASICO,
    required: false,
  })
  @IsEnum(TenantPlan)
  @IsOptional()
  plan?: TenantPlan;

  @ApiProperty({
    description: 'Maximum number of rooms allowed',
    example: 10,
    default: 10,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxRooms?: number;

  // Logo fields are managed via file upload, not through DTO
  logoUrl?: string;
  logoFileName?: string;
  logoMimeType?: string;
  logoFileSize?: number;
}
