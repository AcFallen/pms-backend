import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Check if RUC already exists
    if (createTenantDto.ruc) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { ruc: createTenantDto.ruc },
      });
      if (existingTenant) {
        throw new ConflictException('Tenant with this RUC already exists');
      }
    }

    const tenant = this.tenantRepository.create(createTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async findByPublicId(publicId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { publicId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with public ID ${publicId} not found`);
    }
    return tenant;
  }

  async update(id: number, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    // Check if RUC is being updated and if it already exists
    if (updateTenantDto.ruc && updateTenantDto.ruc !== tenant.ruc) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { ruc: updateTenantDto.ruc },
      });
      if (existingTenant) {
        throw new ConflictException('Tenant with this RUC already exists');
      }
    }

    Object.assign(tenant, updateTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  async remove(id: number): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantRepository.remove(tenant);
  }
}
