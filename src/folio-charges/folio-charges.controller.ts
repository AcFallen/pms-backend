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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FolioChargesService } from './folio-charges.service';
import { CreateFolioChargeDto } from './dto/create-folio-charge.dto';
import { UpdateFolioChargeDto } from './dto/update-folio-charge.dto';
import { FolioCharge } from './entities/folio-charge.entity';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('folio-charges')
@ApiBearerAuth('JWT-auth')
@Controller('folio-charges')
export class FolioChargesController {
  constructor(private readonly folioChargesService: FolioChargesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new folio charge',
    description: 'Creates a new charge for a folio',
  })
  @ApiBody({ type: CreateFolioChargeDto })
  @ApiResponse({
    status: 201,
    description: 'Folio charge successfully created',
    type: FolioCharge,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  create(
    @Body() createFolioChargeDto: CreateFolioChargeDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.folioChargesService.create(createFolioChargeDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all folio charges',
    description: 'Retrieves a list of all folio charges',
  })
  @ApiResponse({
    status: 200,
    description: 'List of folio charges retrieved successfully',
    type: [FolioCharge],
  })
  findAll() {
    return this.folioChargesService.findAll();
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get folio charge by public ID',
    description: 'Retrieves a folio charge by their public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the folio charge',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Folio charge found',
    type: FolioCharge,
  })
  @ApiResponse({
    status: 404,
    description: 'Folio charge not found',
  })
  findByPublicId(@Param('publicId') publicId: string) {
    return this.folioChargesService.findByPublicId(publicId);
  }

  @Get('folio/:folioId')
  @ApiOperation({
    summary: 'Get all charges for a specific folio',
    description: 'Retrieves all charges associated with a folio ID',
  })
  @ApiParam({
    name: 'folioId',
    description: 'Internal ID of the folio',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of charges for the folio',
    type: [FolioCharge],
  })
  findByFolioId(@Param('folioId') folioId: string) {
    return this.folioChargesService.findByFolioId(+folioId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get folio charge by internal ID',
    description: 'Retrieves a folio charge by their internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the folio charge',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Folio charge found',
    type: FolioCharge,
  })
  @ApiResponse({
    status: 404,
    description: 'Folio charge not found',
  })
  findOne(@Param('id') id: string) {
    return this.folioChargesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update folio charge',
    description: 'Updates folio charge information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the folio charge',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdateFolioChargeDto })
  @ApiResponse({
    status: 200,
    description: 'Folio charge successfully updated',
    type: FolioCharge,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Folio charge not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateFolioChargeDto: UpdateFolioChargeDto,
  ) {
    return this.folioChargesService.update(+id, updateFolioChargeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete folio charge',
    description: 'Deletes a folio charge by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the folio charge',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Folio charge successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Folio charge not found',
  })
  remove(@Param('id') id: string) {
    return this.folioChargesService.remove(+id);
  }
}
