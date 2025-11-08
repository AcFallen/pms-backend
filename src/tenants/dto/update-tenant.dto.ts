import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

// Omit status, plan, and maxRooms from updates (only admins can change these)
export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['status', 'plan', 'maxRooms'] as const),
) {}
