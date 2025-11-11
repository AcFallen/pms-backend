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
}
