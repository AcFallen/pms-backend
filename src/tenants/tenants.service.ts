import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateTenantWithManagerDto } from './dto/create-tenant-with-manager.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantConfigResponseDto } from './dto/tenant-config-response.dto';
import { Tenant } from './entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { unlink } from 'fs/promises';
import { join } from 'path';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
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

  /**
   * Creates a new tenant with its first manager user in a single transaction.
   * This is used for complete tenant onboarding.
   *
   * This method:
   * 1. Validates that tenant email and manager email are unique
   * 2. Validates that tenant RUC (if provided) is unique
   * 3. Creates the tenant with all configuration
   * 4. Creates the first manager user with hashed password
   * 5. All operations are performed in a transaction for data consistency
   *
   * @param dto - CreateTenantWithManagerDto with tenant and manager data
   * @returns Promise<{ tenant: Tenant; manager: User }> - Created tenant and manager
   */
  async createWithManager(
    dto: CreateTenantWithManagerDto,
  ): Promise<{ tenant: Tenant; manager: User }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate RUC uniqueness if provided
      if (dto.ruc) {
        const existingTenant = await queryRunner.manager.findOne(Tenant, {
          where: { ruc: dto.ruc },
        });
        if (existingTenant) {
          throw new ConflictException(
            `Tenant with RUC ${dto.ruc} already exists`,
          );
        }
      }

      // 2. Validate tenant email uniqueness
      const existingTenantEmail = await queryRunner.manager.findOne(Tenant, {
        where: { email: dto.email },
      });
      if (existingTenantEmail) {
        throw new ConflictException(
          `Tenant with email ${dto.email} already exists`,
        );
      }

      // 3. Validate manager email uniqueness (emails are globally unique)
      const existingManagerEmail = await queryRunner.manager.findOne(User, {
        where: { email: dto.managerEmail },
      });
      if (existingManagerEmail) {
        throw new ConflictException(
          `User with email ${dto.managerEmail} already exists`,
        );
      }

      // 4. Create tenant
      const tenant = queryRunner.manager.create(Tenant, {
        name: dto.name,
        email: dto.email,
        ruc: dto.ruc || null,
        businessName: dto.businessName || null,
        phone: dto.phone || null,
        address: dto.address || null,
        district: dto.district || null,
        province: dto.province || null,
        department: dto.department || null,
        status: dto.status || undefined,
        plan: dto.plan || undefined,
        maxRooms: dto.maxRooms || 50,
        maxInvoicesPerMonth: dto.maxInvoicesPerMonth || 1000,
        billingMode: dto.billingMode || undefined,
        checkoutPolicy: dto.checkoutPolicy || undefined,
        checkoutTime: dto.checkoutTime || null,
        lateCheckoutFee: dto.lateCheckoutFee || null,
        taxRate: dto.taxRate || 18.0,
      });

      const savedTenant = await queryRunner.manager.save(Tenant, tenant);

      // 5. Create manager user
      const passwordHash = await bcrypt.hash(dto.managerPassword, 10);

      const manager = queryRunner.manager.create(User, {
        tenantId: savedTenant.id,
        email: dto.managerEmail,
        passwordHash,
        firstName: dto.managerFirstName,
        lastName: dto.managerLastName,
        role: UserRole.MANAGER,
        isActive: true,
      });

      const savedManager = await queryRunner.manager.save(User, manager);

      await queryRunner.commitTransaction();

      return {
        tenant: savedTenant,
        manager: savedManager,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
