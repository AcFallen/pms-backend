import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { Rate } from './entities/rate.entity';
import { RoomType } from '../room-types/entities/room-type.entity';

@Injectable()
export class RatesService {
  constructor(
    @InjectRepository(Rate)
    private readonly rateRepository: Repository<Rate>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  async create(createRateDto: CreateRateDto, tenantId: number): Promise<Rate> {
    // Find room type by public ID
    const roomType = await this.roomTypeRepository.findOne({
      where: { publicId: createRateDto.roomTypePublicId, tenantId },
    });
    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    // Create rate with internal roomTypeId
    const { roomTypePublicId, ...rateData } = createRateDto;
    const rate = this.rateRepository.create({
      ...rateData,
      roomTypeId: roomType.id,
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

  async updateByPublicId(publicId: string, updateRateDto: UpdateRateDto, tenantId: number): Promise<Rate> {
    const rate = await this.findByPublicId(publicId, tenantId);

    // If room type is being updated, find it by public ID
    if (updateRateDto.roomTypePublicId) {
      const roomType = await this.roomTypeRepository.findOne({
        where: { publicId: updateRateDto.roomTypePublicId, tenantId },
      });
      if (!roomType) {
        throw new NotFoundException('Room type not found');
      }
      rate.roomTypeId = roomType.id;
    }

    // Update other fields (excluding roomTypePublicId as we already handled it)
    const { roomTypePublicId, ...updateData } = updateRateDto;
    Object.assign(rate, updateData);
    return await this.rateRepository.save(rate);
  }

  async removeByPublicId(publicId: string, tenantId: number): Promise<void> {
    const rate = await this.findByPublicId(publicId, tenantId);
    await this.rateRepository.softRemove(rate);
  }

  async restoreByPublicId(publicId: string, tenantId: number): Promise<Rate> {
    const rate = await this.rateRepository.findOne({
      where: { publicId, tenantId },
      withDeleted: true,
    });

    if (!rate) {
      throw new NotFoundException(`Rate with public ID ${publicId} not found`);
    }

    if (!rate.deletedAt) {
      throw new ConflictException('Rate is not deleted');
    }

    await this.rateRepository.restore({ publicId });
    return this.findByPublicId(publicId, tenantId);
  }
}
