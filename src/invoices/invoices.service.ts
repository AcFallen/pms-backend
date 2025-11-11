import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import { PaginatedInvoicesResponseDto } from './dto/paginated-invoices-response.dto';
import { InvoiceListItemDto } from './dto/invoice-list-item.dto';
import { Invoice } from './entities/invoice.entity';
import { Folio } from '../folios/entities/folio.entity';
import { FolioCharge } from '../folio-charges/entities/folio-charge.entity';
import { TenantVoucherSeries } from '../teanant-vourcher-series/entities/tenant-voucher-series.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Guest } from '../guests/entities/guest.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { NubefactService } from './services/nubefact.service';
import { FolioStatus } from '../folios/enums/folio-status.enum';
import { InvoiceType } from './enums/invoice-type.enum';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { CustomerDocumentType } from './enums/customer-document-type.enum';
import { VoucherType } from '../teanant-vourcher-series/enums/voucher-type.enum';
import { SunatDocumentType } from './enums/sunat-document-type.enum';
import { SunatCustomerDocumentType } from './enums/sunat-customer-document-type.enum';
import { DocumentType } from '../guests/enums/document-type.enum';
import { NubefactRequest, NubefactItem } from './interfaces/nubefact.interface';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Folio)
    private readonly folioRepository: Repository<Folio>,
    @InjectRepository(FolioCharge)
    private readonly folioChargeRepository: Repository<FolioCharge>,
    @InjectRepository(TenantVoucherSeries)
    private readonly voucherSeriesRepository: Repository<TenantVoucherSeries>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    private readonly nubefactService: NubefactService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    tenantId: number,
    filters: FilterInvoicesDto,
  ): Promise<PaginatedInvoicesResponseDto> {
    const {
      page = 1,
      limit = 10,
      invoiceType,
      customerDocumentType,
      customerDocumentNumber,
      createdAtStart,
      createdAtEnd,
    } = filters;

    // Build query
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.folio', 'folio')
      .where('invoice.tenantId = :tenantId', { tenantId });

    // Apply filters
    if (invoiceType) {
      query.andWhere('invoice.invoiceType = :invoiceType', { invoiceType });
    }

    if (customerDocumentType) {
      query.andWhere('invoice.customerDocumentType = :customerDocumentType', {
        customerDocumentType,
      });
    }

    if (customerDocumentNumber) {
      query.andWhere(
        'invoice.customerDocumentNumber ILIKE :customerDocumentNumber',
        {
          customerDocumentNumber: `%${customerDocumentNumber}%`,
        },
      );
    }

    if (createdAtStart && createdAtEnd) {
      query.andWhere(
        'DATE(invoice.createdAt) BETWEEN :createdAtStart AND :createdAtEnd',
        {
          createdAtStart,
          createdAtEnd,
        },
      );
    }

    // Order by creation date descending
    query.orderBy('invoice.createdAt', 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Execute query
    const [invoices, total] = await query.getManyAndCount();

    // Transform to DTO
    const data: InvoiceListItemDto[] = invoices.map((invoice) => ({
      publicId: invoice.publicId,
      fullNumber: invoice.fullNumber,
      invoiceType: invoice.invoiceType,
      customerDocumentType: invoice.customerDocumentType,
      customerDocumentNumber: invoice.customerDocumentNumber,
      customerName: invoice.customerName,
      total: parseFloat(invoice.total.toString()),
      status: invoice.status,
      issueDate: invoice.issueDate,
      pdfUrl: invoice.pdfUrl,
      folioNumber: invoice.folio?.folioNumber || 'N/A',
    }));

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findByPublicId(publicId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { publicId },
      relations: ['folio'],
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice with public ID ${publicId} not found`,
      );
    }

    return invoice;
  }

  /**
   * Generate invoice from folio and send to SUNAT via Nubefact
   */
  async generateFromFolio(
    dto: GenerateInvoiceDto,
    tenantId: number,
  ): Promise<Invoice> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get tenant and check invoice limits
      const tenant = await queryRunner.manager.findOne(Tenant, {
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      }

      // Check if we need to reset the monthly counter
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastResetDate = tenant.lastInvoiceCountReset
        ? new Date(tenant.lastInvoiceCountReset)
        : null;

      // Reset counter if it's a new month or never been reset
      if (!lastResetDate || lastResetDate < currentMonthStart) {
        tenant.currentMonthInvoiceCount = 0;
        tenant.lastInvoiceCountReset = currentMonthStart;
        await queryRunner.manager.save(Tenant, tenant);
      }

      // Validate invoice limit
      if (tenant.currentMonthInvoiceCount >= tenant.maxInvoicesPerMonth) {
        throw new BadRequestException(
          `Monthly invoice limit reached. Your plan allows ${tenant.maxInvoicesPerMonth} invoices per month. Current count: ${tenant.currentMonthInvoiceCount}. Please upgrade your plan or wait until next month.`,
        );
      }

      // 2. Find and validate folio
      const folio = await queryRunner.manager.findOne(Folio, {
        where: { publicId: dto.folioPublicId, tenantId },
        relations: ['reservation'],
      });

      if (!folio) {
        throw new NotFoundException(`Folio ${dto.folioPublicId} not found`);
      }

      if (folio.status !== FolioStatus.CLOSED) {
        throw new BadRequestException(
          `Cannot generate invoice from folio ${folio.folioNumber}. Folio must be CLOSED. Current status: ${folio.status}`,
        );
      }

      // 2. Note: We no longer check if folio already has an invoice
      // A folio can have multiple invoices (selective invoicing)
      // The important check is whether there are charges available to invoice (done below)

      // 3. Get reservation and guest data (optional for walk-in folios)
      let reservation: Reservation | null = null;
      let guest: Guest | null = null;

      if (folio.reservationId) {
        // Folio with reservation (hotel guest)
        reservation = await queryRunner.manager.findOne(Reservation, {
          where: { id: folio.reservationId, tenantId },
        });

        if (!reservation) {
          throw new NotFoundException(
            `Reservation for folio ${folio.folioNumber} not found`,
          );
        }

        guest = await queryRunner.manager.findOne(Guest, {
          where: { id: reservation.guestId, tenantId },
        });

        if (!guest) {
          throw new NotFoundException(
            `Guest for reservation ${reservation.reservationCode} not found`,
          );
        }
      }

      // 4. Get folio charges (items) - only those marked for invoicing and not already invoiced
      const folioCharges = await queryRunner.manager.find(FolioCharge, {
        where: {
          folioId: folio.id,
          tenantId,
          includedInInvoice: true, // Only charges marked for invoicing
          invoiceId: IsNull(), // Not already invoiced
        },
        order: { chargeDate: 'ASC' },
      });

      if (folioCharges.length === 0) {
        throw new BadRequestException(
          `Folio ${folio.folioNumber} has no charges available to invoice. All charges may be excluded or already invoiced.`,
        );
      }

      // 5. Determine customer data (from DTO or guest)
      // For walk-in folios (no reservation), customer data MUST come from DTO
      if (!folio.reservationId && !dto.customerDocumentNumber) {
        throw new BadRequestException(
          'Customer document number is required for walk-in folios (POS sales)',
        );
      }

      const customerDocumentType = dto.customerDocumentType
        ? dto.customerDocumentType
        : guest
          ? this.mapDocumentType(guest.documentType)
          : CustomerDocumentType.DNI;

      const customerDocumentNumber =
        dto.customerDocumentNumber || guest?.documentNumber || '';

      const customerName = dto.customerName
        ? dto.customerName
        : guest
          ? `${guest.firstName} ${guest.lastName}`.toUpperCase()
          : 'CLIENTE GENÉRICO';

      const customerAddress =
        dto.customerAddress || guest?.address || 'SIN DIRECCIÓN';

      const customerEmail = dto.customerEmail || guest?.email || undefined;

      // 6. Get voucher series for tenant
      const voucherType = this.mapInvoiceTypeToVoucherType(dto.invoiceType);
      const voucherSeries = await queryRunner.manager.findOne(
        TenantVoucherSeries,
        {
          where: {
            tenantId,
            voucherType,
            isActive: true,
            isDefault: true,
          },
        },
      );

      if (!voucherSeries) {
        throw new NotFoundException(
          `No active default voucher series found for ${dto.invoiceType}. Please configure series in settings.`,
        );
      }

      // 7. Calculate totals (IGV 18%)
      // El folio.total incluye IGV (es el monto real cobrado)
      // El folio.subtotal es sin IGV, folio.tax es el IGV
      // Usar folio.total como fuente de verdad para evitar errores de redondeo
      const totalConIGV = parseFloat(folio.total.toString());
      const subtotalSinIGV = totalConIGV / 1.18;
      const igv = totalConIGV - subtotalSinIGV;

      const subtotal = parseFloat(subtotalSinIGV.toFixed(2));
      const igvRounded = parseFloat(igv.toFixed(2));
      const total = totalConIGV; // Usar el total original sin redondeo adicional

      // 8. Create invoice record (PENDING status)
      const invoice = queryRunner.manager.create(Invoice, {
        tenantId,
        folioId: folio.id,
        voucherSeriesId: voucherSeries.id,
        invoiceType: dto.invoiceType,
        series: voucherSeries.series,
        number: String(voucherSeries.currentNumber).padStart(8, '0'),
        fullNumber: `${voucherSeries.series}-${String(voucherSeries.currentNumber).padStart(8, '0')}`,
        customerDocumentType,
        customerDocumentNumber,
        customerName,
        customerAddress,
        subtotal,
        igv: igvRounded,
        total,
        status: InvoiceStatus.PENDING,
        issueDate: new Date(),
      });

      const savedInvoice = await queryRunner.manager.save(Invoice, invoice);

      // 9. Prepare Nubefact request
      const nubefactRequest: NubefactRequest = {
        operacion: 'generar_comprobante',
        tipo_de_comprobante: this.mapToSunatDocumentType(dto.invoiceType),
        serie: voucherSeries.series,
        numero: voucherSeries.currentNumber,
        sunat_transaction: 1, // Venta interna
        cliente_tipo_de_documento:
          this.mapToSunatCustomerDocumentType(customerDocumentType),
        cliente_numero_de_documento: customerDocumentNumber,
        cliente_denominacion: customerName,
        cliente_direccion: customerAddress,
        ...(customerEmail && { cliente_email: customerEmail }),
        fecha_de_emision: this.formatDateForNubefact(new Date()),
        moneda: 1, // PEN
        porcentaje_de_igv: 18.0,
        total_gravada: subtotal,
        total_igv: igv,
        total,
        items: this.mapFolioChargesToNubefactItems(folioCharges),
      };

      console.log('Nubefact Request:', nubefactRequest);

      // 10. Send to Nubefact
      const nubefactResponse =
        await this.nubefactService.sendInvoice(nubefactRequest);

      // 11. Update invoice with Nubefact response
      savedInvoice.sunatResponse = JSON.stringify(nubefactResponse);
      savedInvoice.pdfUrl = nubefactResponse.enlace_del_pdf;
      savedInvoice.xmlContent = nubefactResponse.enlace_del_xml;
      savedInvoice.sunatCdr = nubefactResponse.enlace_del_cdr;
      savedInvoice.sentAt = new Date();

      // Determine invoice status based on SUNAT response
      if (nubefactResponse.aceptada_por_sunat === true) {
        // Estado 1: ACEPTADA - SUNAT aceptó el comprobante
        savedInvoice.status = InvoiceStatus.ACCEPTED;
        savedInvoice.acceptedAt = new Date();
      } else if (nubefactResponse.aceptada_por_sunat === false) {
        // aceptada_por_sunat = false, necesitamos revisar sunat_description
        const sunatDescription = nubefactResponse.sunat_description || '';
        const sunatNote = nubefactResponse.sunat_note || '';

        if (sunatDescription.trim() === '' && sunatNote.trim() === '') {
          // Estado 2: PENDIENTE - Aún no procesada por SUNAT (esperando Resumen Diario)
          savedInvoice.status = InvoiceStatus.PENDING;
        } else {
          // Estado 3: RECHAZADA - SUNAT la rechazó con un mensaje de error
          savedInvoice.status = InvoiceStatus.REJECTED;
        }
      }

      await queryRunner.manager.save(Invoice, savedInvoice);

      // 12. Update folio charges with the invoice ID (mark as invoiced)
      for (const charge of folioCharges) {
        charge.invoiceId = savedInvoice.id;
        await queryRunner.manager.save(FolioCharge, charge);
      }

      // 13. Increment voucher series number
      voucherSeries.currentNumber += 1;
      await queryRunner.manager.save(TenantVoucherSeries, voucherSeries);

      // 14. Increment tenant monthly invoice counter
      tenant.currentMonthInvoiceCount += 1;
      await queryRunner.manager.save(Tenant, tenant);

      // 15. Commit transaction
      await queryRunner.commitTransaction();

      return savedInvoice;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Helper methods

  private mapDocumentType(
    guestDocumentType: DocumentType,
  ): CustomerDocumentType {
    const mapping = {
      [DocumentType.DNI]: CustomerDocumentType.DNI,
      [DocumentType.RUC]: CustomerDocumentType.RUC,
      [DocumentType.CE]: CustomerDocumentType.CE,
      [DocumentType.PASSPORT]: CustomerDocumentType.PASSPORT,
    };
    return mapping[guestDocumentType] || CustomerDocumentType.DNI;
  }

  private mapInvoiceTypeToVoucherType(invoiceType: InvoiceType): VoucherType {
    const mapping = {
      [InvoiceType.FACTURA]: VoucherType.FACTURA,
      [InvoiceType.BOLETA]: VoucherType.BOLETA,
      [InvoiceType.NOTA_CREDITO]: VoucherType.NOTA_CREDITO,
      [InvoiceType.NOTA_DEBITO]: VoucherType.NOTA_DEBITO,
    };
    return mapping[invoiceType];
  }

  private mapToSunatDocumentType(invoiceType: InvoiceType): SunatDocumentType {
    const mapping = {
      [InvoiceType.FACTURA]: SunatDocumentType.FACTURA,
      [InvoiceType.BOLETA]: SunatDocumentType.BOLETA,
      [InvoiceType.NOTA_CREDITO]: SunatDocumentType.NOTA_CREDITO,
      [InvoiceType.NOTA_DEBITO]: SunatDocumentType.NOTA_DEBITO,
    };
    return mapping[invoiceType];
  }

  private mapToSunatCustomerDocumentType(
    customerDocumentType: CustomerDocumentType,
  ): SunatCustomerDocumentType {
    const mapping = {
      [CustomerDocumentType.DNI]: SunatCustomerDocumentType.DNI,
      [CustomerDocumentType.RUC]: SunatCustomerDocumentType.RUC,
      [CustomerDocumentType.CE]: SunatCustomerDocumentType.CARNET_EXTRANJERIA,
      [CustomerDocumentType.PASSPORT]: SunatCustomerDocumentType.PASSPORT,
    };
    return mapping[customerDocumentType];
  }

  private formatDateForNubefact(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private mapFolioChargesToNubefactItems(
    charges: FolioCharge[],
  ): NubefactItem[] {
    return charges.map((charge) => {
      const quantity = parseFloat(charge.quantity.toString());
      // El total en la BD incluye IGV (es el precio real cobrado)
      const totalConIGV = parseFloat(charge.total.toString());
      const precioUnitarioConIGV = parseFloat(charge.unitPrice.toString());

      // Calcular subtotal sin IGV (sin redondear intermedios para evitar errores de redondeo)
      const subtotalSinIGV = totalConIGV / 1.18;
      // Calcular IGV como diferencia (no como multiplicación) para mantener el total exacto
      const igvCalculado = totalConIGV - subtotalSinIGV;
      // Calcular valor unitario sin IGV
      const valorUnitarioSinIGV = subtotalSinIGV / quantity;

      // Redondear solo los valores finales que se envían a Nubefact
      return {
        unidad_de_medida: 'ZZ', // Servicio
        codigo: 'SERV-ALOJ',
        descripcion: charge.description,
        cantidad: quantity,
        valor_unitario: parseFloat(valorUnitarioSinIGV.toFixed(2)),
        precio_unitario: precioUnitarioConIGV,
        subtotal: parseFloat(subtotalSinIGV.toFixed(2)),
        tipo_de_igv: 1, // Gravado
        igv: parseFloat(igvCalculado.toFixed(2)),
        total: totalConIGV, // Usar el total original sin redondeo adicional
        anticipo_regularizacion: false,
      };
    });
  }

  /**
   * Check invoice status in SUNAT via Nubefact
   * @param publicId - Invoice public ID
   * @param tenantId - Tenant ID
   * @returns Invoice status response from Nubefact with updated invoice status
   */
  async checkInvoiceStatus(publicId: string, tenantId: number): Promise<any> {
    // 1. Find invoice by publicId
    const invoice = await this.invoiceRepository.findOne({
      where: { publicId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice with publicId ${publicId} not found`,
      );
    }

    // 2. Prepare Nubefact request to check status
    const checkStatusRequest = {
      operacion: 'consultar_comprobante',
      tipo_de_comprobante: this.mapToSunatDocumentType(invoice.invoiceType),
      serie: invoice.series,
      numero: parseInt(invoice.number),
    };

    // 3. Call Nubefact API to check status
    const nubefactResponse =
      await this.nubefactService.checkInvoiceStatus(checkStatusRequest);

    // 4. Update invoice status based on SUNAT response
    if (nubefactResponse.aceptada_por_sunat === true) {
      // Estado 1: ACEPTADA - SUNAT aceptó el comprobante
      invoice.status = InvoiceStatus.ACCEPTED;
      invoice.acceptedAt = new Date();

      // Update links if they're provided and different
      if (
        nubefactResponse.enlace_del_pdf &&
        nubefactResponse.enlace_del_pdf !== invoice.pdfUrl
      ) {
        invoice.pdfUrl = nubefactResponse.enlace_del_pdf;
      }
      if (
        nubefactResponse.enlace_del_xml &&
        nubefactResponse.enlace_del_xml !== invoice.xmlContent
      ) {
        invoice.xmlContent = nubefactResponse.enlace_del_xml;
      }
      if (
        nubefactResponse.enlace_del_cdr &&
        nubefactResponse.enlace_del_cdr !== invoice.sunatCdr
      ) {
        invoice.sunatCdr = nubefactResponse.enlace_del_cdr;
      }

      await this.invoiceRepository.save(invoice);
    } else if (nubefactResponse.aceptada_por_sunat === false) {
      // aceptada_por_sunat = false, necesitamos revisar sunat_description
      const sunatDescription = nubefactResponse.sunat_description || '';
      const sunatNote = nubefactResponse.sunat_note || '';

      if (sunatDescription.trim() === '' && sunatNote.trim() === '') {
        // Estado 2: PENDIENTE - Aún no procesada por SUNAT (esperando Resumen Diario)
        invoice.status = InvoiceStatus.PENDING;
      } else {
        // Estado 3: RECHAZADA - SUNAT la rechazó con un mensaje de error
        invoice.status = InvoiceStatus.REJECTED;
      }

      await this.invoiceRepository.save(invoice);
    }

    // 5. Return the Nubefact response with updated invoice status
    return {
      ...nubefactResponse,
      invoiceStatus: invoice.status,
    };
  }
}
