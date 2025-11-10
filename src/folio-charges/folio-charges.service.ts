import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFolioChargeDto } from './dto/create-folio-charge.dto';
import { UpdateFolioChargeDto } from './dto/update-folio-charge.dto';
import { FolioCharge } from './entities/folio-charge.entity';

@Injectable()
export class FolioChargesService {
  constructor(
    @InjectRepository(FolioCharge)
    private readonly folioChargeRepository: Repository<FolioCharge>,
  ) {}

  async create(
    createFolioChargeDto: CreateFolioChargeDto,
    tenantId: number,
  ): Promise<FolioCharge> {
    const folioCharge = this.folioChargeRepository.create({
      ...createFolioChargeDto,
      tenantId,
    });
    return this.folioChargeRepository.save(folioCharge);
  }

  async findAll(): Promise<FolioCharge[]> {
    return this.folioChargeRepository.find({
      relations: ['folio'],
      order: {
        chargeDate: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<FolioCharge> {
    const folioCharge = await this.folioChargeRepository.findOne({
      where: { id },
      relations: ['folio'],
    });

    if (!folioCharge) {
      throw new NotFoundException(`Folio charge with ID ${id} not found`);
    }

    return folioCharge;
  }

  async findByPublicId(publicId: string): Promise<FolioCharge> {
    const folioCharge = await this.folioChargeRepository.findOne({
      where: { publicId },
      relations: ['folio'],
    });

    if (!folioCharge) {
      throw new NotFoundException(
        `Folio charge with public ID ${publicId} not found`,
      );
    }

    return folioCharge;
  }

  async findByFolioId(folioId: number): Promise<FolioCharge[]> {
    return this.folioChargeRepository.find({
      where: { folioId },
      relations: ['folio'],
      order: {
        chargeDate: 'DESC',
      },
    });
  }

  async update(
    id: number,
    updateFolioChargeDto: UpdateFolioChargeDto,
  ): Promise<FolioCharge> {
    const folioCharge = await this.findOne(id);

    Object.assign(folioCharge, updateFolioChargeDto);
    return this.folioChargeRepository.save(folioCharge);
  }

  async remove(id: number): Promise<void> {
    const folioCharge = await this.findOne(id);
    await this.folioChargeRepository.remove(folioCharge);
  }
}
