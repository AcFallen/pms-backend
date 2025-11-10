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
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate-from-folio')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate invoice from folio and send to SUNAT',
    description:
      'Generates an electronic invoice (Factura or Boleta) from a closed folio and sends it to SUNAT via Nubefact. Auto-fills customer data from guest if not provided. Validates folio is closed and has no previous invoice. Returns invoice with PDF and XML links from SUNAT.',
  })
  @ApiBody({ type: GenerateInvoiceDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice successfully generated and sent to SUNAT',
    type: Invoice,
  })
  @ApiResponse({
    status: 400,
    description: 'Folio not closed, missing charges, or SUNAT validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Folio, guest, or voucher series not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Folio already has an invoice',
  })
  generateFromFolio(
    @Body() generateInvoiceDto: GenerateInvoiceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.invoicesService.generateFromFolio(
      generateInvoiceDto,
      user.tenantId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new invoice manually',
    description: 'Creates a new invoice manually (for advanced use)',
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
