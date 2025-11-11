import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateChargeInvoiceInclusionDto {
  @ApiProperty({
    description:
      'Whether this charge should be included in the next invoice generation',
    example: false,
  })
  @IsBoolean()
  includedInInvoice: boolean;
}
