import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { FilterGuestsDto } from './dto/filter-guests.dto';
import { Guest } from './entities/guest.entity';
import { PaginatedGuests } from './interfaces/paginated-guests.interface';

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
  ) {}

  async create(createGuestDto: CreateGuestDto, tenantId: number): Promise<Guest> {
    // Check if guest with same document already exists for this tenant
    const existingGuest = await this.guestRepository.findOne({
      where: {
        documentType: createGuestDto.documentType,
        documentNumber: createGuestDto.documentNumber,
        tenantId,
      },
    });
    if (existingGuest) {
      throw new ConflictException(
        `Guest with ${createGuestDto.documentType} ${createGuestDto.documentNumber} already exists`,
      );
    }

    const guest = this.guestRepository.create({
      ...createGuestDto,
      tenantId,
    });
    return await this.guestRepository.save(guest);
  }

  async findAll(
    tenantId: number,
    filterDto: FilterGuestsDto,
  ): Promise<PaginatedGuests> {
    const { search, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.guestRepository
      .createQueryBuilder('guest')
      .where('guest.tenantId = :tenantId', { tenantId });

    // Apply search filter if provided
    if (search) {
      queryBuilder.andWhere(
        '(guest.firstName ILIKE :search OR guest.lastName ILIKE :search OR guest.email ILIKE :search OR guest.phone ILIKE :search OR guest.documentNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and ordering
    const guests = await queryBuilder
      .orderBy('guest.lastName', 'ASC')
      .addOrderBy('guest.firstName', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: guests,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: number, tenantId: number): Promise<Guest> {
    const guest = await this.guestRepository.findOne({
      where: { id, tenantId },
    });
    if (!guest) {
      throw new NotFoundException(`Guest with ID ${id} not found`);
    }
    return guest;
  }

  async findByPublicId(publicId: string, tenantId: number): Promise<Guest> {
    const guest = await this.guestRepository.findOne({
      where: { publicId, tenantId },
    });
    if (!guest) {
      throw new NotFoundException(`Guest with public ID ${publicId} not found`);
    }
    return guest;
  }

  async updateByPublicId(
    publicId: string,
    updateGuestDto: UpdateGuestDto,
    tenantId: number,
  ): Promise<Guest> {
    const guest = await this.findByPublicId(publicId, tenantId);

    // Check if document is being updated and if it already exists
    if (
      (updateGuestDto.documentType || updateGuestDto.documentNumber) &&
      (updateGuestDto.documentType !== guest.documentType ||
        updateGuestDto.documentNumber !== guest.documentNumber)
    ) {
      const existingGuest = await this.guestRepository.findOne({
        where: {
          documentType: updateGuestDto.documentType || guest.documentType,
          documentNumber: updateGuestDto.documentNumber || guest.documentNumber,
          tenantId,
        },
      });
      if (existingGuest && existingGuest.id !== guest.id) {
        throw new ConflictException(
          `Guest with ${updateGuestDto.documentType || guest.documentType} ${updateGuestDto.documentNumber || guest.documentNumber} already exists`,
        );
      }
    }

    Object.assign(guest, updateGuestDto);
    return await this.guestRepository.save(guest);
  }

  async removeByPublicId(publicId: string, tenantId: number): Promise<void> {
    const guest = await this.findByPublicId(publicId, tenantId);
    await this.guestRepository.softRemove(guest);
  }

  async restoreByPublicId(publicId: string, tenantId: number): Promise<Guest> {
    const guest = await this.guestRepository.findOne({
      where: { publicId, tenantId },
      withDeleted: true,
    });

    if (!guest) {
      throw new NotFoundException(`Guest with public ID ${publicId} not found`);
    }

    if (!guest.deletedAt) {
      throw new ConflictException('Guest is not deleted');
    }

    await this.guestRepository.restore({ publicId });
    return this.findByPublicId(publicId, tenantId);
  }
}
