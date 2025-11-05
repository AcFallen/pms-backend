import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { Guest } from './entities/guest.entity';

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

  async findAll(tenantId: number): Promise<Guest[]> {
    return await this.guestRepository.find({
      where: { tenantId },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
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

  async update(id: number, updateGuestDto: UpdateGuestDto, tenantId: number): Promise<Guest> {
    const guest = await this.findOne(id, tenantId);

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

  async remove(id: number, tenantId: number): Promise<void> {
    const guest = await this.findOne(id, tenantId);
    await this.guestRepository.remove(guest);
  }
}
