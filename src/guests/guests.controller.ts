import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { FilterGuestsDto } from './dto/filter-guests.dto';
import { SearchGuestDto } from './dto/search-guest.dto';
import { Guest } from './entities/guest.entity';
import { PaginatedGuests } from './interfaces/paginated-guests.interface';
import { GuestSearchResponse } from './interfaces/external-api-response.interface';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('guests')
@ApiBearerAuth('JWT-auth')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new guest',
    description: 'Creates a new guest for the authenticated tenant',
  })
  @ApiBody({ type: CreateGuestDto })
  @ApiResponse({
    status: 201,
    description: 'Guest successfully created',
    type: Guest,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Guest with same document already exists',
  })
  create(
    @Body() createGuestDto: CreateGuestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Guest> {
    return this.guestsService.create(createGuestDto, user.tenantId);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search guest by document',
    description:
      'Searches for guest information by document type and number. First checks the database, then queries external APIs (RENIEC for DNI, SUNAT for RUC) if not found. Maximum wait time: 30 seconds for external APIs.',
  })
  @ApiBody({ type: SearchGuestDto })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', nullable: true },
        lastName: { type: 'string', nullable: true },
        documentType: { type: 'string', example: 'DNI' },
        documentNumber: { type: 'string', example: '77206879' },
        email: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        city: { type: 'string', nullable: true },
        country: { type: 'string', nullable: true },
        birthDate: { type: 'string', nullable: true },
        notes: { type: 'string', nullable: true },
        source: {
          type: 'string',
          enum: ['database', 'external_api', 'not_found'],
          example: 'external_api',
        },
        message: {
          type: 'string',
          example: 'Información obtenida de RENIEC',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document type or number',
  })
  @ApiResponse({
    status: 408,
    description: 'External API request timeout (exceeded 30 seconds)',
  })
  searchGuest(
    @Body() searchDto: SearchGuestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<GuestSearchResponse> {
    return this.guestsService.searchGuest(searchDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all guests with filters and pagination',
    description: 'Retrieves guests for the authenticated tenant with optional search filter and pagination. Search applies to firstName, lastName, email, phone, and documentNumber.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for firstName, lastName, email, phone, or documentNumber',
    example: 'John',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of guests retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Guest' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAll(
    @Query() filterDto: FilterGuestsDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PaginatedGuests> {
    return this.guestsService.findAll(user.tenantId, filterDto);
  }

  @Get(':publicId')
  @ApiOperation({
    summary: 'Get guest by public ID',
    description: 'Retrieves a guest by its public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the guest',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Guest found',
    type: Guest,
  })
  @ApiResponse({
    status: 404,
    description: 'Guest not found',
  })
  findOne(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Guest> {
    return this.guestsService.findByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId')
  @ApiOperation({
    summary: 'Update guest by public ID',
    description: 'Updates guest information by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the guest',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiBody({ type: UpdateGuestDto })
  @ApiResponse({
    status: 200,
    description: 'Guest successfully updated',
    type: Guest,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Guest not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Guest with same document already exists',
  })
  update(
    @Param('publicId') publicId: string,
    @Body() updateGuestDto: UpdateGuestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Guest> {
    return this.guestsService.updateByPublicId(publicId, updateGuestDto, user.tenantId);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete guest (soft delete)',
    description: 'Soft deletes a guest by public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the guest',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Guest successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Guest not found',
  })
  remove(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    return this.guestsService.removeByPublicId(publicId, user.tenantId);
  }

  @Patch(':publicId/restore')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Restore deleted guest (Admin only)',
    description: 'Restores a soft-deleted guest by public UUID. Only accessible by ADMIN role.',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the guest',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Guest successfully restored',
    type: Guest,
  })
  @ApiResponse({
    status: 404,
    description: 'Guest not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Guest is not deleted',
  })
  restore(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Guest> {
    return this.guestsService.restoreByPublicId(publicId, user.tenantId);
  }
}
