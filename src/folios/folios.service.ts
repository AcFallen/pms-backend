import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFolioDto } from './dto/create-folio.dto';
import { UpdateFolioDto } from './dto/update-folio.dto';
import { Folio } from './entities/folio.entity';

@Injectable()
export class FoliosService {
  constructor(
    @InjectRepository(Folio)
    private readonly folioRepository: Repository<Folio>,
  ) {}

  async create(createFolioDto: CreateFolioDto): Promise<Folio> {
    // Check if folio number already exists
    const existingFolio = await this.folioRepository.findOne({
      where: { folioNumber: createFolioDto.folioNumber },
    });

    if (existingFolio) {
      throw new ConflictException(
        `Folio with number ${createFolioDto.folioNumber} already exists`,
      );
    }

    const folio = this.folioRepository.create(createFolioDto);
    return this.folioRepository.save(folio);
  }

  async findAll(): Promise<Folio[]> {
    return this.folioRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Folio> {
    const folio = await this.folioRepository.findOne({
      where: { id },
    });

    if (!folio) {
      throw new NotFoundException(`Folio with ID ${id} not found`);
    }

    return folio;
  }

  async findByPublicId(publicId: string): Promise<Folio> {
    const folio = await this.folioRepository.findOne({
      where: { publicId },
    });

    if (!folio) {
      throw new NotFoundException(`Folio with public ID ${publicId} not found`);
    }

    return folio;
  }

  async update(id: number, updateFolioDto: UpdateFolioDto): Promise<Folio> {
    const folio = await this.findOne(id);

    // If updating folio number, check for conflicts
    if (
      updateFolioDto.folioNumber &&
      updateFolioDto.folioNumber !== folio.folioNumber
    ) {
      const existingFolio = await this.folioRepository.findOne({
        where: { folioNumber: updateFolioDto.folioNumber },
      });

      if (existingFolio) {
        throw new ConflictException(
          `Folio with number ${updateFolioDto.folioNumber} already exists`,
        );
      }
    }

    Object.assign(folio, updateFolioDto);
    return this.folioRepository.save(folio);
  }

  async remove(id: number): Promise<void> {
    const folio = await this.findOne(id);
    await this.folioRepository.remove(folio);
  }
}
