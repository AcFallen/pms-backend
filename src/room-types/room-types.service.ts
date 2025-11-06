import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomType } from './entities/room-type.entity';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  async create(createRoomTypeDto: CreateRoomTypeDto, tenantId: number): Promise<RoomType> {
    const roomType = this.roomTypeRepository.create({
      ...createRoomTypeDto,
      tenantId,
    });
    return await this.roomTypeRepository.save(roomType);
  }

  async findAll(tenantId: number): Promise<RoomType[]> {
    return await this.roomTypeRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number, tenantId: number): Promise<RoomType> {
    const roomType = await this.roomTypeRepository.findOne({
      where: { id, tenantId },
    });
    if (!roomType) {
      throw new NotFoundException(`Room type with ID ${id} not found`);
    }
    return roomType;
  }

  async findByPublicId(publicId: string, tenantId: number): Promise<RoomType> {
    const roomType = await this.roomTypeRepository.findOne({
      where: { publicId, tenantId },
    });
    if (!roomType) {
      throw new NotFoundException(`Room type with public ID ${publicId} not found`);
    }
    return roomType;
  }

  async updateByPublicId(publicId: string, updateRoomTypeDto: UpdateRoomTypeDto, tenantId: number): Promise<RoomType> {
    const roomType = await this.findByPublicId(publicId, tenantId);
    Object.assign(roomType, updateRoomTypeDto);
    return await this.roomTypeRepository.save(roomType);
  }

  async removeByPublicId(publicId: string, tenantId: number): Promise<void> {
    const roomType = await this.findByPublicId(publicId, tenantId);
    await this.roomTypeRepository.softRemove(roomType);
  }

  async restoreByPublicId(publicId: string, tenantId: number): Promise<RoomType> {
    const roomType = await this.roomTypeRepository.findOne({
      where: { publicId, tenantId },
      withDeleted: true,
    });

    if (!roomType) {
      throw new NotFoundException(`Room type with public ID ${publicId} not found`);
    }

    if (!roomType.deletedAt) {
      throw new ConflictException('Room type is not deleted');
    }

    await this.roomTypeRepository.restore({ publicId });
    return this.findByPublicId(publicId, tenantId);
  }
}
