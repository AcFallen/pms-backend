import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDate,
  IsBoolean,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';

export class CreateGuestIncidentDto {
  @ApiProperty({
    description: 'Public ID de la reserva asociada a la incidencia',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsString()
  reservationPublicId: string;

  @ApiProperty({
    description: 'Tipo de incidencia',
    enum: IncidentType,
    example: IncidentType.DAMAGE,
  })
  @IsNotEmpty()
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({
    description: 'Nivel de severidad de la incidencia',
    enum: IncidentSeverity,
    example: IncidentSeverity.HIGH,
  })
  @IsNotEmpty()
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({
    description: 'Título corto de la incidencia',
    example: 'Daño al mobiliario de la habitación',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Descripción detallada de la incidencia',
    example:
      'El huésped rompió la lámpara de la mesa de noche. Se requiere reemplazo completo.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Fecha y hora en que ocurrió la incidencia',
    example: '2025-11-13T10:30:00Z',
    type: String,
    format: 'date-time',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  incidentDate: Date;

  @ApiProperty({
    description:
      '¿Bloquear futuras reservas de este huésped? (para casos muy graves)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  blockFutureBookings?: boolean;
}
