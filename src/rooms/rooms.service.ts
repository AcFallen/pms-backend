import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async create(createRoomDto: CreateRoomDto, tenantId: number): Promise<Room> {
    // Check if room number already exists for this tenant
    const existingRoom = await this.roomRepository.findOne({
      where: { roomNumber: createRoomDto.roomNumber, tenantId },
    });
    if (existingRoom) {
      throw new ConflictException('Room number already exists for this tenant');
    }

    const room = this.roomRepository.create({
      ...createRoomDto,
      tenantId,
    });
    return await this.roomRepository.save(room);
  }

  async findAll(tenantId: number): Promise<Room[]> {
    return await this.roomRepository.find({
      where: { tenantId },
      relations: ['roomType'],
      order: { roomNumber: 'ASC' },
    });
  }

  async findOne(id: number, tenantId: number): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { id, tenantId },
      relations: ['roomType'],
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  async findByPublicId(publicId: string, tenantId: number): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { publicId, tenantId },
      relations: ['roomType'],
    });
    if (!room) {
      throw new NotFoundException(`Room with public ID ${publicId} not found`);
    }
    return room;
  }

  async update(id: number, updateRoomDto: UpdateRoomDto, tenantId: number): Promise<Room> {
    const room = await this.findOne(id, tenantId);

    // Check if room number is being updated and if it already exists
    if (updateRoomDto.roomNumber && updateRoomDto.roomNumber !== room.roomNumber) {
      const existingRoom = await this.roomRepository.findOne({
        where: { roomNumber: updateRoomDto.roomNumber, tenantId },
      });
      if (existingRoom) {
        throw new ConflictException('Room number already exists for this tenant');
      }
    }

    Object.assign(room, updateRoomDto);
    return await this.roomRepository.save(room);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const room = await this.findOne(id, tenantId);
    await this.roomRepository.softRemove(room);
  }
}
