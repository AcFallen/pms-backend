import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { Room } from './entities/room.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { RoomStatus } from './enums/room-status.enum';
import { CleaningStatus } from './enums/cleaning-status.enum';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
  ) {}

  async create(createRoomDto: CreateRoomDto, tenantId: number): Promise<Room> {
    // Find room type by public ID
    const roomType = await this.roomTypeRepository.findOne({
      where: { publicId: createRoomDto.roomTypePublicId, tenantId },
    });
    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    // Check if room number already exists for this tenant
    const existingRoom = await this.roomRepository.findOne({
      where: { roomNumber: createRoomDto.roomNumber, tenantId },
    });
    if (existingRoom) {
      throw new ConflictException('Room number already exists for this tenant');
    }

    // Create room with internal roomTypeId
    const { roomTypePublicId, ...roomData } = createRoomDto;
    const room = this.roomRepository.create({
      ...roomData,
      roomTypeId: roomType.id,
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

  async findForCalendarSidebar(
    tenantId: number,
    filterDto: FilterRoomsDto,
  ): Promise<Room[]> {
    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .where('room.tenantId = :tenantId', { tenantId });

    // Search by room number
    if (filterDto.search) {
      queryBuilder.andWhere('room.roomNumber ILIKE :search', {
        search: `%${filterDto.search}%`,
      });
    }

    // Filter by room status
    if (filterDto.status) {
      queryBuilder.andWhere('room.status = :status', {
        status: filterDto.status,
      });
    }

    // Filter by cleaning status
    if (filterDto.cleaningStatus) {
      queryBuilder.andWhere('room.cleaningStatus = :cleaningStatus', {
        cleaningStatus: filterDto.cleaningStatus,
      });
    }

    // Filter by room type public ID
    if (filterDto.roomTypePublicId) {
      queryBuilder.andWhere('roomType.publicId = :roomTypePublicId', {
        roomTypePublicId: filterDto.roomTypePublicId,
      });
    }

    // Order by room number
    queryBuilder.orderBy('room.roomNumber', 'ASC');

    return await queryBuilder.getMany();
  }

  async findAvailableAndClean(tenantId: number): Promise<Room[]> {
    return await this.roomRepository.find({
      where: {
        tenantId,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
      },
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

  async updateByPublicId(
    publicId: string,
    updateRoomDto: UpdateRoomDto,
    tenantId: number,
  ): Promise<Room> {
    const room = await this.findByPublicId(publicId, tenantId);

    // Check if room number is being updated and if it already exists
    if (
      updateRoomDto.roomNumber &&
      updateRoomDto.roomNumber !== room.roomNumber
    ) {
      const existingRoom = await this.roomRepository.findOne({
        where: { roomNumber: updateRoomDto.roomNumber, tenantId },
      });
      if (existingRoom) {
        throw new ConflictException(
          'Room number already exists for this tenant',
        );
      }
    }

    // Update other fields (excluding roomTypePublicId)
    const { roomTypePublicId, ...updateData } = updateRoomDto;
    Object.assign(room, updateData);

    // If room type is being updated, find it by public ID and update roomTypeId
    if (roomTypePublicId) {
      const roomType = await this.roomTypeRepository.findOne({
        where: { publicId: roomTypePublicId, tenantId },
      });
      if (!roomType) {
        throw new NotFoundException('Room type not found');
      }
      room.roomTypeId = roomType.id;
    }

    // Clear the loaded relation to force TypeORM to update roomTypeId
    // TypeORM ignores changes to roomTypeId when the relation is already loaded
    (room as any).roomType = undefined;

    await this.roomRepository.save(room);

    // Reload the room with updated relations
    return await this.findByPublicId(publicId, tenantId);
  }

  async removeByPublicId(publicId: string, tenantId: number): Promise<void> {
    const room = await this.findByPublicId(publicId, tenantId);
    await this.roomRepository.softRemove(room);
  }

  async restoreByPublicId(publicId: string, tenantId: number): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { publicId, tenantId },
      withDeleted: true,
    });

    if (!room) {
      throw new NotFoundException(`Room with public ID ${publicId} not found`);
    }

    if (!room.deletedAt) {
      throw new ConflictException('Room is not deleted');
    }

    await this.roomRepository.restore({ publicId });
    return this.findByPublicId(publicId, tenantId);
  }
}
