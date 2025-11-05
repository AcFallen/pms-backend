import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { Invoice } from './entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, tenantId: number): Promise<Invoice> {
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
      throw new NotFoundException(`Invoice with public ID ${publicId} not found`);
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

  async findByFullNumber(fullNumber: string, tenantId: number): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { fullNumber, tenantId },
      relations: ['folio'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with full number ${fullNumber} not found`);
    }

    return invoice;
  }

  async update(id: number, updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
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
}
