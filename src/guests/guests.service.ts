import { Injectable, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { FilterGuestsDto } from './dto/filter-guests.dto';
import { SearchGuestDto } from './dto/search-guest.dto';
import { Guest } from './entities/guest.entity';
import { DocumentType } from './enums/document-type.enum';
import { PaginatedGuests } from './interfaces/paginated-guests.interface';
import {
  GuestSearchResponse,
  DniApiResponse,
  RucApiResponse,
} from './interfaces/external-api-response.interface';

@Injectable()
export class GuestsService {
  private readonly API_PERU_TOKEN = '0zvWuTr1zbRWPONCOOWqASrd1pGKLDtaQXYUL1D3EYDGo1cu3U';
  private readonly API_TIMEOUT = 30000; // 30 seconds

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

  async searchGuest(
    searchDto: SearchGuestDto,
    tenantId: number,
  ): Promise<GuestSearchResponse> {
    const { documentType, documentNumber } = searchDto;

    // 1. First, search in database
    const existingGuest = await this.guestRepository.findOne({
      where: {
        documentType,
        documentNumber,
        tenantId,
      },
    });

    if (existingGuest) {
      return {
        publicId: existingGuest.publicId,  // Return publicId for direct use in reservations
        firstName: existingGuest.firstName,
        lastName: existingGuest.lastName,
        documentType: existingGuest.documentType,
        documentNumber: existingGuest.documentNumber,
        email: existingGuest.email,
        phone: existingGuest.phone,
        address: existingGuest.address,
        city: existingGuest.city,
        country: existingGuest.country,
        birthDate: existingGuest.birthDate ? existingGuest.birthDate.toISOString().split('T')[0] : null,
        notes: existingGuest.notes,
        source: 'database',
        message: 'Huésped encontrado en la base de datos',
      };
    }

    // 2. If not found in database and is DNI or RUC, search in external API
    if (documentType === DocumentType.DNI || documentType === DocumentType.RUC) {
      try {
        const apiData = await this.fetchFromExternalApi(documentType, documentNumber);
        return apiData;
      } catch (error) {
        // If API fails, return not found
        return this.createNotFoundResponse(documentType, documentNumber);
      }
    }

    // 3. For other document types (PASSPORT, CE), return not found
    return this.createNotFoundResponse(documentType, documentNumber);
  }

  private async fetchFromExternalApi(
    documentType: DocumentType,
    documentNumber: string,
  ): Promise<GuestSearchResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.API_TIMEOUT);

    try {
      let url: string;

      if (documentType === DocumentType.DNI) {
        url = `https://apiperu.info/api/dni/${documentNumber}`;
      } else if (documentType === DocumentType.RUC) {
        url = `https://apiperu.info/api/ruc/${documentNumber}`;
      } else {
        return this.createNotFoundResponse(documentType, documentNumber);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.API_PERU_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return this.createNotFoundResponse(documentType, documentNumber);
      }

      const data = await response.json();

      if (!data.success) {
        return this.createNotFoundResponse(documentType, documentNumber);
      }

      // Parse response based on document type
      if (documentType === DocumentType.DNI) {
        return this.parseDniResponse(data as DniApiResponse, documentNumber);
      } else {
        return this.parseRucResponse(data as RucApiResponse, documentNumber);
      }
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new HttpException(
          'La búsqueda en la API externa ha excedido el tiempo límite (30 segundos)',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      return this.createNotFoundResponse(documentType, documentNumber);
    }
  }

  private parseDniResponse(apiResponse: DniApiResponse, documentNumber: string): GuestSearchResponse {
    const data = apiResponse.data;

    // Combine address fields
    const fullAddress: string | null = data.direccion_completa || data.direccion || null;

    // Combine city (distrito, provincia, departamento)
    let city: string | null = null;
    if (data.distrito || data.provincia || data.departamento) {
      const parts = [data.distrito, data.provincia, data.departamento].filter(Boolean);
      city = parts.length > 0 ? parts.join(', ') : null;
    }

    // Combine lastName
    const lastNameParts = [data.apellido_paterno, data.apellido_materno].filter(Boolean);
    const lastName: string | null = lastNameParts.length > 0 ? lastNameParts.join(' ') : null;

    return {
      publicId: null,  // From external API, guest not yet created
      firstName: data.nombres || null,
      lastName: lastName,
      documentType: DocumentType.DNI,
      documentNumber: documentNumber,
      email: null,
      phone: null,
      address: fullAddress,
      city: city,
      country: 'PE', // Peru
      birthDate: null,
      notes: null,
      source: 'external_api',
      message: 'Información obtenida de RENIEC',
    };
  }

  private parseRucResponse(apiResponse: RucApiResponse, documentNumber: string): GuestSearchResponse {
    const data = apiResponse.data;

    // For RUC, nombre_o_razon_social is the full name/business name
    const fullName = data.nombre_o_razon_social || '';

    // Try to split into firstName and lastName (this is approximate for business names)
    let firstName: string | null = fullName || null;
    let lastName: string | null = null;

    // If it looks like a person's name (starts with numbers indicating DNI-based RUC)
    if (documentNumber.length === 11 && documentNumber.startsWith('10') && fullName) {
      const nameParts = fullName.split(' ');
      if (nameParts.length >= 3) {
        // Assume: APELLIDO_PATERNO APELLIDO_MATERNO NOMBRES
        const lastNameParts = [nameParts[0], nameParts[1]];
        lastName = lastNameParts.join(' ').trim() || null;
        firstName = nameParts.slice(2).join(' ').trim() || null;
      }
    }

    // Combine city (distrito, provincia, departamento)
    let city: string | null = null;
    if (data.distrito || data.provincia || data.departamento) {
      const parts = [data.distrito, data.provincia, data.departamento].filter(Boolean);
      city = parts.length > 0 ? parts.join(', ') : null;
    }

    // Create notes from estado and condicion
    let notes: string | null = null;
    if (data.estado && data.condicion) {
      notes = `Estado: ${data.estado}, Condición: ${data.condicion}`;
    }

    return {
      publicId: null,  // From external API, guest not yet created
      firstName: firstName,
      lastName: lastName,
      documentType: DocumentType.RUC,
      documentNumber: documentNumber,
      email: null,
      phone: null,
      address: data.direccion || null,
      city: city,
      country: 'PE', // Peru
      birthDate: null,
      notes: notes,
      source: 'external_api',
      message: 'Información obtenida de SUNAT',
    };
  }

  private createNotFoundResponse(
    documentType: DocumentType,
    documentNumber: string,
  ): GuestSearchResponse {
    return {
      publicId: null,  // Guest not found
      firstName: null,
      lastName: null,
      documentType: documentType,
      documentNumber: documentNumber,
      email: null,
      phone: null,
      address: null,
      city: null,
      country: null,
      birthDate: null,
      notes: null,
      source: 'not_found',
      message: 'No se encontró información para el documento proporcionado',
    };
  }
}
