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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { GenerateInvoiceWithoutSunatDto } from './dto/generate-invoice-without-sunat.dto';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import { PaginatedInvoicesResponseDto } from './dto/paginated-invoices-response.dto';
import { Invoice } from './entities/invoice.entity';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@ApiTags('invoices')
@ApiBearerAuth('JWT-auth')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate-without-sunat')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate invoice from folio WITHOUT SUNAT integration (local mode)',
    description:
      'Generates a local invoice (Factura or Boleta) from a closed folio WITHOUT sending to SUNAT. This is useful for demos, development, or while SUNAT integration is not active. The invoice is immediately marked as ACCEPTED and charges are marked as invoiced. All validations and business logic are applied except the SUNAT API call.',
  })
  @ApiBody({ type: GenerateInvoiceWithoutSunatDto })
  @ApiResponse({
    status: 201,
    description: 'Invoice successfully generated locally (no SUNAT)',
    type: Invoice,
  })
  @ApiResponse({
    status: 400,
    description: 'Folio not closed, missing charges, or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Folio, guest, or voucher series not found',
  })
  generateWithoutSunat(
    @Body() dto: GenerateInvoiceWithoutSunatDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.invoicesService.generateFromFolioWithoutSunat(
      dto,
      user.tenantId,
    );
  }

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

  @Get()
  @ApiOperation({
    summary: 'Get all invoices with pagination and filters',
    description:
      'Retrieves a paginated list of invoices for the authenticated tenant with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of invoices retrieved successfully',
    type: PaginatedInvoicesResponseDto,
  })
  findAll(
    @Query() filters: FilterInvoicesDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.invoicesService.findAll(user.tenantId, filters);
  }

  @Get(':publicId/check-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check invoice status in SUNAT',
    description:
      'Queries Nubefact to check the current status of an invoice in SUNAT. If the invoice is accepted by SUNAT (aceptada_por_sunat = true), the invoice status will be automatically updated to ACCEPTED. If rejected, it will be updated to REJECTED.',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    description: 'Invoice public ID (UUID)',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice status retrieved successfully from SUNAT',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Error communicating with Nubefact',
  })
  checkInvoiceStatus(
    @Param('publicId') publicId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.invoicesService.checkInvoiceStatus(publicId, user.tenantId);
  }
}
