import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

export default class MainSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);

    // Default tenant ID for seeding
    const defaultTenantId = 1;

    // Check if users already exist
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('⏭️  Users already exist, skipping seed...');
      return;
    }

    console.log('🌱 Seeding basic users...');

    // Hash the default password
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create basic users for each role
    const users = [
      {
        tenantId: defaultTenantId,
        email: 'admin@example.com',
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
        email: 'manager@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
        email: 'receptionist@example.com',
        passwordHash,
        firstName: 'Jane',
        lastName: 'Receptionist',
        role: UserRole.RECEPTIONIST,
        isActive: true,
      },
      {
        tenantId: defaultTenantId,
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
