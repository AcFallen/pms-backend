import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { Invoice } from './entities/invoice.entity';
import { Folio } from '../folios/entities/folio.entity';
import { FolioCharge } from '../folio-charges/entities/folio-charge.entity';
import { TenantVoucherSeries } from '../teanant-vourcher-series/entities/tenant-voucher-series.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Guest } from '../guests/entities/guest.entity';
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

  async create(
    createInvoiceDto: CreateInvoiceDto,
    tenantId: number,
  ): Promise<Invoice> {
    // Check if invoice with same series and number already exists
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        tenantId,
        series: createInvoiceDto.series,
        number: createInvoiceDto.number,
      },
    });

    if (existingInvoice) {
      throw new ConflictException(
        `Invoice with series ${createInvoiceDto.series} and number ${createInvoiceDto.number} already exists`,
      );
    }

    const invoice = this.invoiceRepository.create({
      ...createInvoiceDto,
      tenantId,
    });
    return this.invoiceRepository.save(invoice);
  }

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      relations: ['folio'],
      order: {
        issueDate: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['folio'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
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

  async findByFolioId(folioId: number): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { folioId },
      relations: ['folio'],
      order: {
        issueDate: 'DESC',
      },
    });
  }

  async findByFullNumber(
    fullNumber: string,
    tenantId: number,
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { fullNumber, tenantId },
      relations: ['folio'],
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice with full number ${fullNumber} not found`,
      );
    }

    return invoice;
  }

  async update(
    id: number,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // If updating series/number, check for conflicts
    if (
      (updateInvoiceDto.series && updateInvoiceDto.series !== invoice.series) ||
      (updateInvoiceDto.number && updateInvoiceDto.number !== invoice.number)
    ) {
      const newSeries = updateInvoiceDto.series || invoice.series;
      const newNumber = updateInvoiceDto.number || invoice.number;

      const existingInvoice = await this.invoiceRepository.findOne({
        where: {
          tenantId: invoice.tenantId,
          series: newSeries,
          number: newNumber,
        },
      });

      if (existingInvoice && existingInvoice.id !== invoice.id) {
        throw new ConflictException(
          `Invoice with series ${newSeries} and number ${newNumber} already exists`,
        );
      }
    }

    Object.assign(invoice, updateInvoiceDto);
    return this.invoiceRepository.save(invoice);
  }

  async remove(id: number): Promise<void> {
    const invoice = await this.findOne(id);
    await this.invoiceRepository.remove(invoice);
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
      // 1. Find and validate folio
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

      // 2. Check if folio already has an invoice
      const existingInvoice = await queryRunner.manager.findOne(Invoice, {
        where: { folioId: folio.id, tenantId },
      });

      if (existingInvoice) {
        throw new ConflictException(
          `Folio ${folio.folioNumber} already has an invoice: ${existingInvoice.fullNumber}`,
        );
      }

      // 3. Get reservation and guest data
      const reservation = await queryRunner.manager.findOne(Reservation, {
        where: { id: folio.reservationId, tenantId },
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation for folio ${folio.folioNumber} not found`,
        );
      }

      const guest = await queryRunner.manager.findOne(Guest, {
        where: { id: reservation.guestId, tenantId },
      });

      if (!guest) {
        throw new NotFoundException(
          `Guest for reservation ${reservation.reservationCode} not found`,
        );
      }

      // 4. Get folio charges (items)
      const folioCharges = await queryRunner.manager.find(FolioCharge, {
        where: { folioId: folio.id, tenantId },
        order: { chargeDate: 'ASC' },
      });

      if (folioCharges.length === 0) {
        throw new BadRequestException(
          `Folio ${folio.folioNumber} has no charges to invoice`,
        );
      }

      // 5. Determine customer data (from DTO or guest)
      const customerDocumentType =
        dto.customerDocumentType || this.mapDocumentType(guest.documentType);
      const customerDocumentNumber =
        dto.customerDocumentNumber || guest.documentNumber;
      const customerName =
        dto.customerName ||
        `${guest.firstName} ${guest.lastName}`.toUpperCase();
      const customerAddress =
        dto.customerAddress || guest.address || 'SIN DIRECCIÓN';
      const customerEmail = dto.customerEmail || guest.email || undefined;

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
      const subtotal = parseFloat(folio.subtotal.toString());
      const igv = subtotal * 0.18;
      const total = subtotal + igv;

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
        igv,
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

      // 10. Send to Nubefact
      const nubefactResponse =
        await this.nubefactService.sendInvoice(nubefactRequest);

      // 11. Update invoice with Nubefact response
      savedInvoice.sunatResponse = JSON.stringify(nubefactResponse);
      savedInvoice.pdfUrl = nubefactResponse.enlace_del_pdf;
      savedInvoice.xmlContent = nubefactResponse.enlace_del_xml;
      savedInvoice.sunatCdr = nubefactResponse.enlace_del_cdr;
      savedInvoice.sentAt = new Date();

      if (nubefactResponse.aceptada_por_sunat) {
        savedInvoice.status = InvoiceStatus.ACCEPTED;
        savedInvoice.acceptedAt = new Date();
      } else {
        savedInvoice.status = InvoiceStatus.REJECTED;
      }

      await queryRunner.manager.save(Invoice, savedInvoice);

      // 12. Increment voucher series number
      voucherSeries.currentNumber += 1;
      await queryRunner.manager.save(TenantVoucherSeries, voucherSeries);

      // 13. Commit transaction
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
      const valorUnitario = parseFloat(charge.unitPrice.toString());
      const precioUnitario = valorUnitario * 1.18; // With IGV
      const subtotal = valorUnitario * quantity;
      const igv = subtotal * 0.18;
      const total = subtotal + igv;

      return {
        unidad_de_medida: 'ZZ', // Servicio
        codigo: 'SERV-ALOJ',
        descripcion: charge.description,
        cantidad: quantity,
        valor_unitario: valorUnitario,
        precio_unitario: precioUnitario,
        subtotal,
        tipo_de_igv: 1, // Gravado
        igv,
        total,
        anticipo_regularizacion: false,
      };
    });
  }
}
