import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, tenantId: number): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      tenantId,
    });
    return this.paymentRepository.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({
      relations: ['folio'],
      order: {
        paymentDate: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['folio'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findByPublicId(publicId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { publicId },
      relations: ['folio'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with public ID ${publicId} not found`);
    }

    return payment;
  }

  async findByFolioId(folioId: number): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { folioId },
      relations: ['folio'],
      order: {
        paymentDate: 'DESC',
      },
    });
  }

  async update(id: number, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);

    Object.assign(payment, updatePaymentDto);
    return this.paymentRepository.save(payment);
  }

  async remove(id: number): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentRepository.remove(payment);
  }
}
