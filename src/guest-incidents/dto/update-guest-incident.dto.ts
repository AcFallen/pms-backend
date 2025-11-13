import { PartialType } from '@nestjs/swagger';
import { CreateGuestIncidentDto } from './create-guest-incident.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGuestIncidentDto extends PartialType(
  CreateGuestIncidentDto,
) {
  @ApiPropertyOptional({
    description: 'Public ID de la reserva (si se desea cambiar)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  reservationPublicId?: string;
}
