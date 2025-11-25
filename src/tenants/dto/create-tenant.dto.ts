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
  Matches,
  IsDecimal,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus } from '../enums/tenant-status.enum';
import { TenantPlan } from '../enums/tenant-plan.enum';
import { BillingMode } from '../enums/billing-mode.enum';
import { CheckoutPolicy } from '../enums/checkout-policy.enum';
import { Transform } from 'class-transformer';

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

  @ApiProperty({
    description:
      'Maximum number of invoices (facturas/boletas) allowed per month',
    example: 100,
    default: 100,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxInvoicesPerMonth?: number;

  @ApiProperty({
    description:
      'Billing mode: fixed_price (precio fijo) o minimum_price (precio mínimo flexible)',
    enum: BillingMode,
    example: BillingMode.FIXED_PRICE,
    default: BillingMode.FIXED_PRICE,
    required: false,
  })
  @IsEnum(BillingMode)
  @IsOptional()
  billingMode?: BillingMode;

  @ApiProperty({
    description:
      'Checkout policy: fixed_time (hora fija) o flexible_24h (24 horas desde check-in)',
    enum: CheckoutPolicy,
    example: CheckoutPolicy.FIXED_TIME,
    default: CheckoutPolicy.FIXED_TIME,
    required: false,
  })
  @IsEnum(CheckoutPolicy)
  @IsOptional()
  checkoutPolicy?: CheckoutPolicy;

  @ApiProperty({
    description:
      'Checkout time (formato HH:mm:ss, solo si checkoutPolicy es fixed_time)',
    example: '12:00:00',
    pattern: '^([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)$',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'checkoutTime must be in HH:mm:ss format',
  })
  checkoutTime?: string;

  @ApiProperty({
    description: 'Late checkout fee (cargo adicional por checkout tardío)',
    example: '20.00',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  lateCheckoutFee?: string;

  @ApiProperty({
    description: 'Porcentaje de IGV a aplicar (18.00 = 18%)',
    example: 18.0,
    default: 18.0,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @Min(0)
  taxRate?: number;

  // Logo fields are managed via file upload, not through DTO
  logoUrl?: string;
  logoFileName?: string;
  logoMimeType?: string;
  logoFileSize?: number;
}
