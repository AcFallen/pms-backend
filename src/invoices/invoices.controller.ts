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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new invoice',
    description: 'Creates a new invoice for a folio',
  })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice successfully created',
    type: Invoice,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Invoice with this series and number already exists',
  })
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.invoicesService.create(createInvoiceDto, user.tenantId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all invoices',
    description: 'Retrieves a list of all invoices',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices retrieved successfully',
    type: [Invoice],
  })
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get('public/:publicId')
  @ApiOperation({
    summary: 'Get invoice by public ID',
    description: 'Retrieves an invoice by their public UUID',
  })
  @ApiParam({
    name: 'publicId',
    description: 'Public UUID of the invoice',
    example: '550e8400-e29b-41d4-a716-446655440000',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
    type: Invoice,
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  findByPublicId(@Param('publicId') publicId: string) {
    return this.invoicesService.findByPublicId(publicId);
  }

  @Get('folio/:folioId')
  @ApiOperation({
    summary: 'Get all invoices for a specific folio',
    description: 'Retrieves all invoices associated with a folio ID',
  })
  @ApiParam({
    name: 'folioId',
    description: 'Internal ID of the folio',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices for the folio',
    type: [Invoice],
  })
  findByFolioId(@Param('folioId') folioId: string) {
    return this.invoicesService.findByFolioId(+folioId);
  }

  @Get('number/:fullNumber')
  @ApiOperation({
    summary: 'Get invoice by full number',
    description: 'Retrieves an invoice by their full number (series-number)',
  })
  @ApiParam({
    name: 'fullNumber',
    description: 'Full invoice number',
    example: 'B001-00000001',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
    type: Invoice,
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  findByFullNumber(
    @Param('fullNumber') fullNumber: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.invoicesService.findByFullNumber(fullNumber, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get invoice by internal ID',
    description: 'Retrieves an invoice by their internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the invoice',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice found',
    type: Invoice,
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update invoice',
    description: 'Updates invoice information by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the invoice',
    example: 1,
    type: Number,
  })
  @ApiBody({ type: UpdateInvoiceDto })
  @ApiResponse({
    status: 200,
    description: 'Invoice successfully updated',
    type: Invoice,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Invoice with this series and number already exists',
  })
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoicesService.update(+id, updateInvoiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete invoice',
    description: 'Deletes an invoice by internal ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Internal ID of the invoice',
    example: 1,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice successfully deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(+id);
  }
}
