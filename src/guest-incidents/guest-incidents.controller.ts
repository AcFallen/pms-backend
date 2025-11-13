import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { GuestIncidentsService } from './guest-incidents.service';
import { CreateGuestIncidentDto } from './dto/create-guest-incident.dto';
import { UpdateGuestIncidentDto } from './dto/update-guest-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import {
  GuestIncidentResponseDto,
  GuestStatusDto,
  FilterGuestIncidentsDto,
} from './dto/guest-incident-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('Guest Incidents')
@ApiBearerAuth('JWT-auth')
@Controller('guest-incidents')
@UseGuards(JwtAuthGuard)
export class GuestIncidentsController {
  constructor(private readonly guestIncidentsService: GuestIncidentsService) {}

  /**
   * POST /guest-incidents
   * Crear una nueva incidencia asociada a una reserva
   */
  @Post()
  @ApiOperation({
    summary: 'Crear una nueva incidencia',
    description:
      'Registra una nueva incidencia asociada a una reserva y huésped. La incidencia quedará vinculada permanentemente al huésped para su historial.',
  })
  @ApiResponse({
    status: 201,
    description: 'Incidencia creada exitosamente',
    type: GuestIncidentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva no encontrada',
  })
  @ApiResponse({
    status: 400,
    description: 'La reserva debe tener un huésped asociado',
  })
  async create(
    @Body() createGuestIncidentDto: CreateGuestIncidentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.guestIncidentsService.create(
      createGuestIncidentDto,
      user.tenantId,
      user.userId,
    );
  }

  /**
   * GET /guest-incidents
   * Obtener todas las incidencias con filtros opcionales
   */
  @Get()
  @ApiOperation({
    summary: 'Listar incidencias con filtros',
    description:
      'Obtiene todas las incidencias del tenant con opciones de filtrado por huésped, reserva, severidad, tipo, estado y fechas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de incidencias',
    type: [GuestIncidentResponseDto],
  })
  async findAll(
    @Query() filters: FilterGuestIncidentsDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GuestIncidentResponseDto[]> {
    return await this.guestIncidentsService.findAll(user.tenantId, filters);
  }

  /**
   * GET /guest-incidents/guest/:guestPublicId/history
   * Obtener historial completo de incidencias de un huésped
   */
  @Get('guest/:guestPublicId/history')
  @ApiOperation({
    summary: 'Historial de incidencias del huésped',
    description:
      'Obtiene el historial completo de todas las incidencias registradas para un huésped específico, ordenadas por fecha de incidencia descendente.',
  })
  @ApiParam({
    name: 'guestPublicId',
    description: 'Public ID del huésped',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de incidencias del huésped',
    type: [GuestIncidentResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Huésped no encontrado',
  })
  async getGuestHistory(
    @Param('guestPublicId') guestPublicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GuestIncidentResponseDto[]> {
    return await this.guestIncidentsService.getGuestIncidentHistory(
      guestPublicId,
      user.tenantId,
    );
  }

  /**
   * GET /guest-incidents/guest/:guestPublicId/status
   * Verificar el estado de un huésped (si tiene incidencias graves)
   */
  @Get('guest/:guestPublicId/status')
  @ApiOperation({
    summary: 'Verificar estado del huésped',
    description:
      'Verifica si un huésped tiene incidencias graves, críticas o sin resolver. Útil para validar antes de crear una nueva reserva.',
  })
  @ApiParam({
    name: 'guestPublicId',
    description: 'Public ID del huésped',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del huésped',
    type: GuestStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Huésped no encontrado',
  })
  async checkGuestStatus(
    @Param('guestPublicId') guestPublicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GuestStatusDto> {
    return await this.guestIncidentsService.checkGuestStatus(
      guestPublicId,
      user.tenantId,
    );
  }

  /**
   * GET /guest-incidents/:publicId
   * Obtener una incidencia específica por publicId
   */
  @Get(':publicId')
  @ApiOperation({
    summary: 'Obtener una incidencia',
    description: 'Obtiene los detalles completos de una incidencia específica.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public ID de la incidencia',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles de la incidencia',
    type: GuestIncidentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Incidencia no encontrada',
  })
  async findOne(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GuestIncidentResponseDto> {
    return await this.guestIncidentsService.findOne(publicId, user.tenantId);
  }

  /**
   * PATCH /guest-incidents/:publicId
   * Actualizar una incidencia
   */
  @Patch(':publicId')
  @ApiOperation({
    summary: 'Actualizar una incidencia',
    description:
      'Actualiza los datos de una incidencia existente. Se pueden modificar todos los campos excepto el estado de resolución.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public ID de la incidencia',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Incidencia actualizada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Incidencia no encontrada',
  })
  async update(
    @Param('publicId') publicId: string,
    @Body() updateGuestIncidentDto: UpdateGuestIncidentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.guestIncidentsService.update(
      publicId,
      updateGuestIncidentDto,
      user.tenantId,
    );
  }

  /**
   * POST /guest-incidents/:publicId/resolve
   * Marcar una incidencia como resuelta
   */
  @Post(':publicId/resolve')
  @ApiOperation({
    summary: 'Resolver una incidencia',
    description:
      'Marca una incidencia como resuelta, registrando las notas de resolución y el usuario que la resolvió.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public ID de la incidencia',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Incidencia resuelta exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Incidencia no encontrada',
  })
  @ApiResponse({
    status: 400,
    description: 'La incidencia ya está resuelta',
  })
  async resolve(
    @Param('publicId') publicId: string,
    @Body() resolveIncidentDto: ResolveIncidentDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.guestIncidentsService.resolve(
      publicId,
      resolveIncidentDto,
      user.tenantId,
      user.userId,
    );
  }

  /**
   * POST /guest-incidents/:publicId/reopen
   * Reabrir una incidencia que fue resuelta
   */
  @Post(':publicId/reopen')
  @ApiOperation({
    summary: 'Reabrir una incidencia',
    description:
      'Reabre una incidencia que fue previamente marcada como resuelta. Limpia las notas de resolución.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public ID de la incidencia',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Incidencia reabierta exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Incidencia no encontrada',
  })
  @ApiResponse({
    status: 400,
    description: 'La incidencia no está resuelta',
  })
  async reopen(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.guestIncidentsService.reopen(publicId, user.tenantId);
  }

  /**
   * DELETE /guest-incidents/:publicId
   * Eliminar una incidencia
   */
  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar una incidencia',
    description:
      'Elimina permanentemente una incidencia del sistema. Esta acción no se puede deshacer.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public ID de la incidencia',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Incidencia eliminada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Incident deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Incidencia no encontrada',
  })
  async remove(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.guestIncidentsService.remove(publicId, user.tenantId);
    return {
      message: 'Incident deleted successfully',
    };
  }
}
