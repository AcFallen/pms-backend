import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveIncidentDto {
  @ApiProperty({
    description:
      'Notas sobre la resolución de la incidencia (ej: huésped pagó el daño, se llegó a un acuerdo, etc.)',
    example:
      'El huésped pagó S/. 500 por el daño a la lámpara. Se emitió recibo de pago.',
  })
  @IsNotEmpty()
  @IsString()
  resolutionNotes: string;
}
