import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { TenantStatus } from '../../tenants/enums/tenant-status.enum';
import { TenantPlan } from '../../tenants/enums/tenant-plan.enum';
import * as bcrypt from 'bcrypt';

export default class MainSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const tenantRepository = dataSource.getRepository(Tenant);
    const userRepository = dataSource.getRepository(User);

    // Check if data already exists
    const existingTenants = await tenantRepository.count();
    if (existingTenants > 0) {
      console.log('⏭️  Data already exists, skipping seed...');
      return;
    }

    console.log('🌱 Seeding default tenant...');

    // Create default tenant
    const tenant = tenantRepository.create({
      name: 'Demo Hotel',
      email: 'contact@demohotel.com',
      phone: '+51987654321',
      address: 'Av. Principal 123',
      district: 'Miraflores',
      province: 'Lima',
      department: 'Lima',
      status: TenantStatus.ACTIVE,
      plan: TenantPlan.PREMIUM,
      maxRooms: 50,
    });

    const createdTenant = await tenantRepository.save(tenant);
    console.log(`✅ Tenant created: ${createdTenant.name} - ID: ${createdTenant.id}, Public ID: ${createdTenant.publicId}`);

    console.log('\n🌱 Seeding basic users...');

    // Hash the default password
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create basic users for each role
    const users = [
      {
        tenantId: createdTenant.id,
        email: 'admin@example.com',
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        email: 'manager@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        email: 'receptionist@example.com',
        passwordHash,
        firstName: 'Jane',
        lastName: 'Receptionist',
        role: UserRole.RECEPTIONIST,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        email: 'housekeeper@example.com',
        passwordHash,
        firstName: 'Mary',
        lastName: 'Housekeeper',
        role: UserRole.HOUSEKEEPER,
        isActive: true,
      },
    ];

    // Insert users
    const createdUsers = await userRepository.save(users);

    console.log('✅ Successfully created users:');
    createdUsers.forEach((user) => {
      console.log(`   - ${user.email} (${user.role}) - ID: ${user.id}, Public ID: ${user.publicId}`);
    });
    console.log(`\n📝 Default password for all users: ${defaultPassword}`);
  }
}
