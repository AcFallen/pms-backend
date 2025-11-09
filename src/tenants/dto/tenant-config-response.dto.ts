import { ApiProperty } from '@nestjs/swagger';
import { BillingMode } from '../enums/billing-mode.enum';
import { CheckoutPolicy } from '../enums/checkout-policy.enum';

export class TenantConfigResponseDto {
  @ApiProperty({
    description: 'Billing mode: fixed_price (precio fijo) o minimum_price (precio mínimo flexible)',
    enum: BillingMode,
    example: BillingMode.FIXED_PRICE,
  })
  billingMode: BillingMode;

  @ApiProperty({
    description: 'Checkout policy: fixed_time (hora fija) o flexible_24h (24 horas desde check-in)',
    enum: CheckoutPolicy,
    example: CheckoutPolicy.FIXED_TIME,
  })
  checkoutPolicy: CheckoutPolicy;

  @ApiProperty({
    description: 'Checkout time (formato HH:mm:ss, solo si checkoutPolicy es fixed_time)',
    example: '12:00:00',
    nullable: true,
  })
  checkoutTime: string | null;

  @ApiProperty({
    description: 'Late checkout fee (cargo adicional por checkout tardío)',
    example: '20.00',
    type: String,
    nullable: true,
  })
  lateCheckoutFee: string | null;
}
