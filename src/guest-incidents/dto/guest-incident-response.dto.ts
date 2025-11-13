import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IncidentType } from '../enums/incident-type.enum';
import { IncidentSeverity } from '../enums/incident-severity.enum';

export class GuestIncidentResponseDto {
  @ApiProperty({
    description: 'Public ID de la incidencia',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  publicId: string;

  @ApiProperty({
    description: 'Public ID del huésped',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  guestPublicId: string;

  @ApiProperty({
    description: 'Nombre completo del huésped',
    example: 'Juan Pérez García',
  })
  guestName: string;

  @ApiProperty({
    description: 'Código de la reserva asociada',
    example: 'RES-001',
  })
  reservationCode: string;

  @ApiProperty({
    description: 'Tipo de incidencia',
    enum: IncidentType,
    example: IncidentType.DAMAGE,
  })
  type: IncidentType;

  @ApiProperty({
    description: 'Nivel de severidad',
    enum: IncidentSeverity,
    example: IncidentSeverity.HIGH,
  })
  severity: IncidentSeverity;

  @ApiProperty({
    description: 'Título de la incidencia',
    example: 'Daño al mobiliario',
  })
  title: string;

  @ApiProperty({
    description: 'Descripción detallada',
    example: 'El huésped rompió la lámpara de la mesa de noche',
  })
  description: string;

  @ApiProperty({
    description: 'Fecha en que ocurrió la incidencia',
    example: '2025-11-13T10:30:00Z',
  })
  incidentDate: Date;

  @ApiProperty({
    description: '¿La incidencia está resuelta?',
    example: false,
  })
  isResolved: boolean;

  @ApiPropertyOptional({
    description: 'Notas sobre la resolución (si está resuelta)',
    example: 'El huésped pagó el daño',
    nullable: true,
  })
  resolutionNotes: string | null;

  @ApiPropertyOptional({
    description: 'Fecha de resolución (si está resuelta)',
    example: '2025-11-14T15:00:00Z',
    nullable: true,
  })
  resolvedAt: Date | null;

  @ApiProperty({
    description: '¿Se debe bloquear futuras reservas de este huésped?',
    example: false,
  })
  blockFutureBookings: boolean;

  @ApiProperty({
    description: 'Nombre del usuario que reportó la incidencia',
    example: 'María García',
  })
  reportedByUserName: string;

  @ApiPropertyOptional({
    description: 'Nombre del usuario que resolvió la incidencia',
    example: 'Carlos López',
    nullable: true,
  })
  resolvedByUserName: string | null;

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2025-11-13T10:35:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2025-11-13T10:35:00Z',
  })
  updatedAt: Date;
}

export class GuestStatusDto {
  @ApiProperty({
    description: '¿El huésped tiene prohibido hacer nuevas reservas?',
    example: false,
  })
  hasBlockedStatus: boolean;

  @ApiProperty({
    description: 'Cantidad de incidencias de nivel CRÍTICO',
    example: 0,
  })
  criticalIncidentsCount: number;

  @ApiProperty({
    description: 'Cantidad de incidencias sin resolver',
    example: 1,
  })
  unresolvedIncidentsCount: number;

  @ApiProperty({
    description: 'Cantidad total de incidencias',
    example: 3,
  })
  totalIncidentsCount: number;
}

export class FilterGuestIncidentsDto {
  @ApiPropertyOptional({
    description: 'Filtrar por public ID del huésped',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  guestPublicId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por public ID de la reserva',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  reservationPublicId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por nivel de severidad',
    enum: IncidentSeverity,
    example: IncidentSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de incidencia',
    enum: IncidentType,
    example: IncidentType.DAMAGE,
  })
  @IsOptional()
  @IsEnum(IncidentType)
  type?: IncidentType;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de resolución',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isResolved?: boolean;

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (YYYY-MM-DD)',
    example: '2025-11-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (YYYY-MM-DD)',
    example: '2025-11-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
