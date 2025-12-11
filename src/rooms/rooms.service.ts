import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { FilterRoomsDto } from './dto/filter-rooms.dto';
import { Room } from './entities/room.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { RoomStatus } from './enums/room-status.enum';
import { CleaningStatus } from './enums/cleaning-status.enum';
import { CleaningTask } from '../cleaning-tasks/entities/cleaning-task.entity';
import { TaskStatus } from '../cleaning-tasks/enums/task-status.enum';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomType)
    private readonly roomTypeRepository: Repository<RoomType>,
    @InjectRepository(CleaningTask)
    private readonly cleaningTaskRepository: Repository<CleaningTask>,
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

  async findGroupedByFloor(tenantId: number): Promise<{
    [floor: number]: Array<{
      publicId: string;
      roomType: { publicId: string; name: string };
      roomNumber: string;
      floor: number | null;
      status: string;
      cleaningStatus: string;
      cleaningTaskPublicId: string | null;
    }>;
  }> {
    const rooms = await this.roomRepository.find({
      where: { tenantId },
      relations: ['roomType'],
      order: { floor: 'ASC', roomNumber: 'ASC' },
    });

    // Get all room IDs
    const roomIds = rooms.map((room) => room.id);

    // Find all cleaning tasks that are pending or in_progress for these rooms
    const cleaningTasks = await this.cleaningTaskRepository.find({
      where: {
        tenantId,
        roomId: In(roomIds),
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
      },
      select: ['roomId', 'publicId'],
    });

    // Create a map of roomId -> cleaningTask publicId
    const cleaningTaskMap = new Map<number, string>();
    cleaningTasks.forEach((task) => {
      cleaningTaskMap.set(task.roomId, task.publicId);
    });

    // Group rooms by floor
    const groupedRooms: {
      [floor: number]: Array<{
        publicId: string;
        roomType: { publicId: string; name: string };
        roomNumber: string;
        floor: number | null;
        status: string;
        cleaningStatus: string;
        cleaningTaskPublicId: string | null;
      }>;
    } = {};

    rooms.forEach((room) => {
      const floor = room.floor ?? 0; // Use 0 for null floors (sin piso asignado)

      if (!groupedRooms[floor]) {
        groupedRooms[floor] = [];
      }

      groupedRooms[floor].push({
        publicId: room.publicId,
        roomType: {
          publicId: room.roomType.publicId,
          name: room.roomType.name,
        },
        roomNumber: room.roomNumber,
        floor: room.floor,
        status: room.status,
        cleaningStatus: room.cleaningStatus,
        cleaningTaskPublicId: cleaningTaskMap.get(room.id) || null,
      });
    });

    return groupedRooms;
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
