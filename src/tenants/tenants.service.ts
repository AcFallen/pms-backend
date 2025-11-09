import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantConfigResponseDto } from './dto/tenant-config-response.dto';
import { Tenant } from './entities/tenant.entity';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Elimina el archivo de logo anterior si existe
   */
  private async deleteOldLogo(logoFileName: string | null): Promise<void> {
    if (!logoFileName) return;

    try {
      const filePath = join(process.cwd(), 'uploads', 'logos', logoFileName);
      await unlink(filePath);
    } catch (error) {
      // Si el archivo no existe, no hacer nada
      console.warn(`Could not delete old logo: ${logoFileName}`, error);
    }
  }

  async create(
    createTenantDto: CreateTenantDto,
    logoFile?: Express.Multer.File,
  ): Promise<Tenant> {
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

    // Si se subió un logo, agregar la información del archivo
    if (logoFile) {
      tenant.logoUrl = `/uploads/logos/${logoFile.filename}`;
      tenant.logoFileName = logoFile.filename;
      tenant.logoMimeType = logoFile.mimetype;
      tenant.logoFileSize = logoFile.size;
    }

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
      throw new NotFoundException(
        `Tenant with public ID ${publicId} not found`,
      );
    }
    return tenant;
  }

  async update(
    id: number,
    updateTenantDto: UpdateTenantDto,
    logoFile?: Express.Multer.File,
  ): Promise<Tenant> {
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

    // Si se subió un nuevo logo
    if (logoFile) {
      // Eliminar el logo anterior si existe
      await this.deleteOldLogo(tenant.logoFileName);

      // Actualizar con el nuevo logo
      updateTenantDto.logoUrl = `/uploads/logos/${logoFile.filename}`;
      updateTenantDto.logoFileName = logoFile.filename;
      updateTenantDto.logoMimeType = logoFile.mimetype;
      updateTenantDto.logoFileSize = logoFile.size;
    }

    Object.assign(tenant, updateTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  async remove(id: number): Promise<void> {
    const tenant = await this.findOne(id);

    // Eliminar el logo si existe
    await this.deleteOldLogo(tenant.logoFileName);

    await this.tenantRepository.remove(tenant);
  }

  /**
   * Elimina solo el logo de un tenant
   */
  async removeLogo(id: number): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (tenant.logoFileName) {
      await this.deleteOldLogo(tenant.logoFileName);

      tenant.logoUrl = null;
      tenant.logoFileName = null;
      tenant.logoMimeType = null;
      tenant.logoFileSize = null;

      return await this.tenantRepository.save(tenant);
    }

    return tenant;
  }

  /**
   * Obtiene solo la configuración de facturación y checkout del tenant
   */
  async getConfig(id: number): Promise<TenantConfigResponseDto> {
    const tenant = await this.findOne(id);

    return {
      billingMode: tenant.billingMode,
      checkoutPolicy: tenant.checkoutPolicy,
      checkoutTime: tenant.checkoutTime,
      lateCheckoutFee: tenant.lateCheckoutFee,
    };
  }
}
