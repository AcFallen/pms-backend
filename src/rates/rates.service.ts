import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { Rate } from './entities/rate.entity';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly rateRepository: Repository<Rate>,
  ) {}

  async create(createRateDto: CreateRateDto, tenantId: number): Promise<Rate> {
    const rate = this.rateRepository.create({
      ...createRateDto,
      tenantId,
    });
    return await this.rateRepository.save(rate);
  }

  async findAll(tenantId: number): Promise<Rate[]> {
    return await this.rateRepository.find({
      where: { tenantId },
      relations: ['roomType'],
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: number, tenantId: number): Promise<Rate> {
    const rate = await this.rateRepository.findOne({
      where: { id, tenantId },
      relations: ['roomType'],
    });
    if (!rate) {
      throw new NotFoundException(`Rate with ID ${id} not found`);
    }
    return rate;
  }

  async findByPublicId(publicId: string, tenantId: number): Promise<Rate> {
    const rate = await this.rateRepository.findOne({
      where: { publicId, tenantId },
      relations: ['roomType'],
    });
    if (!rate) {
      throw new NotFoundException(`Rate with public ID ${publicId} not found`);
    }
    return rate;
  }

  async update(id: number, updateRateDto: UpdateRateDto, tenantId: number): Promise<Rate> {
    const rate = await this.findOne(id, tenantId);
    Object.assign(rate, updateRateDto);
    return await this.rateRepository.save(rate);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const rate = await this.findOne(id, tenantId);
    await this.rateRepository.softRemove(rate);
  }
}
