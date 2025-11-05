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
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { Guest } from './entities/guest.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  create(@Body() createGuestDto: CreateGuestDto, @CurrentUser() user: any) {
    return this.guestsService.create(createGuestDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all guests',
    description: 'Retrieves all guests for the authenticated tenant, ordered by last name and first name',
  })
  @ApiResponse({
    status: 200,
    description: 'List of guests retrieved successfully',
    type: [Guest],
  })
  findAll(@CurrentUser() user: any) {
    return this.guestsService.findAll(user.tenantId);
  }

  @Get('public/:publicId')
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
  findByPublicId(@Param('publicId') publicId: string, @CurrentUser() user: any) {
    return this.guestsService.findByPublicId(publicId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get guest by internal ID',
    description: 'Retrieves a guest by its internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the guest',
    example: 1,
    type: Number,
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
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.guestsService.findOne(+id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update guest',
    description: 'Updates guest information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the guest',
    example: 1,
    type: Number,
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
    @Param('id') id: string,
    @Body() updateGuestDto: UpdateGuestDto,
    @CurrentUser() user: any,
  ) {
    return this.guestsService.update(+id, updateGuestDto, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete guest',
    description: 'Deletes a guest by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the guest',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Guest successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Guest not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.guestsService.remove(+id, user.tenantId);
  }
}
