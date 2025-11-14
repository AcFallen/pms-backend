import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../users/entities/user.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ProductCategory } from '../../product-categories/entities/product-category.entity';
import { Product } from '../../products/entities/product.entity';
import { RoomType } from '../../room-types/entities/room-type.entity';
import { Room } from '../../rooms/entities/room.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { TenantStatus } from '../../tenants/enums/tenant-status.enum';
import { TenantPlan } from '../../tenants/enums/tenant-plan.enum';
import { RoomStatus } from '../../rooms/enums/room-status.enum';
import { CleaningStatus } from '../../rooms/enums/cleaning-status.enum';
import * as bcrypt from 'bcrypt';

export default class MainSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const tenantRepository = dataSource.getRepository(Tenant);
    const userRepository = dataSource.getRepository(User);
    const productCategoryRepository = dataSource.getRepository(ProductCategory);
    const productRepository = dataSource.getRepository(Product);
    const roomTypeRepository = dataSource.getRepository(RoomType);
    const roomRepository = dataSource.getRepository(Room);

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
    console.log(
      `✅ Tenant created: ${createdTenant.name} - ID: ${createdTenant.id}, Public ID: ${createdTenant.publicId}`,
    );

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
      console.log(
        `   - ${user.email} (${user.role}) - ID: ${user.id}, Public ID: ${user.publicId}`,
      );
    });
    console.log(`\n📝 Default password for all users: ${defaultPassword}`);

    // ========================================
    // PRODUCT CATEGORIES
    // ========================================
    console.log('\n🌱 Seeding product categories...');

    const categories = [
      {
        tenantId: createdTenant.id,
        name: 'Bebidas',
        description: 'Bebidas alcohólicas y no alcohólicas',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Snacks',
        description: 'Snacks y aperitivos',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Comida',
        description: 'Platos de comida y menús',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Servicios',
        description: 'Servicios adicionales del hotel',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Minibar',
        description: 'Productos del minibar de habitación',
        isActive: true,
      },
    ];

    const createdCategories = await productCategoryRepository.save(categories);
    console.log(`✅ Created ${createdCategories.length} product categories`);

    // ========================================
    // PRODUCTS
    // ========================================
    console.log('\n🌱 Seeding products...');

    const bebidasCategory = createdCategories.find((c) => c.name === 'Bebidas');
    const snacksCategory = createdCategories.find((c) => c.name === 'Snacks');
    const comidaCategory = createdCategories.find((c) => c.name === 'Comida');
    const serviciosCategory = createdCategories.find(
      (c) => c.name === 'Servicios',
    );
    const minibarCategory = createdCategories.find((c) => c.name === 'Minibar');

    const products = [
      // Bebidas
      {
        tenantId: createdTenant.id,
        categoryId: bebidasCategory!.id,
        name: 'Gaseosa Inka Kola 500ml',
        description: 'Gaseosa Inka Kola de 500ml',
        sku: 'BEB-001',
        price: '4.50',
        cost: '2.50',
        stock: 100,
        minStock: 20,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: bebidasCategory!.id,
        name: 'Coca Cola 500ml',
        description: 'Gaseosa Coca Cola de 500ml',
        sku: 'BEB-002',
        price: '4.50',
        cost: '2.50',
        stock: 100,
        minStock: 20,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: bebidasCategory!.id,
        name: 'Agua San Luis 625ml',
        description: 'Agua mineral sin gas',
        sku: 'BEB-003',
        price: '2.50',
        cost: '1.00',
        stock: 150,
        minStock: 30,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: bebidasCategory!.id,
        name: 'Cerveza Cusqueña 330ml',
        description: 'Cerveza Cusqueña dorada',
        sku: 'BEB-004',
        price: '8.00',
        cost: '4.50',
        stock: 80,
        minStock: 15,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: bebidasCategory!.id,
        name: 'Jugo de Naranja Natural',
        description: 'Jugo de naranja natural recién exprimido',
        sku: 'BEB-005',
        price: '6.00',
        cost: '2.50',
        stock: 50,
        minStock: 10,
        trackInventory: true,
        isActive: true,
      },
      // Snacks
      {
        tenantId: createdTenant.id,
        categoryId: snacksCategory!.id,
        name: 'Papas Lays Original',
        description: 'Papas fritas Lays sabor original',
        sku: 'SNK-001',
        price: '3.50',
        cost: '1.80',
        stock: 120,
        minStock: 25,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: snacksCategory!.id,
        name: 'Chocolate Sublime',
        description: 'Chocolate con leche y maní',
        sku: 'SNK-002',
        price: '2.50',
        cost: '1.20',
        stock: 100,
        minStock: 20,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: snacksCategory!.id,
        name: 'Galletas Soda Field',
        description: 'Galletas de soda',
        sku: 'SNK-003',
        price: '2.00',
        cost: '1.00',
        stock: 80,
        minStock: 15,
        trackInventory: true,
        isActive: true,
      },
      // Comida
      {
        tenantId: createdTenant.id,
        categoryId: comidaCategory!.id,
        name: 'Desayuno Continental',
        description: 'Pan, mantequilla, mermelada, café y jugo',
        sku: 'COM-001',
        price: '15.00',
        cost: '7.00',
        stock: 0,
        minStock: 0,
        trackInventory: false,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: comidaCategory!.id,
        name: 'Desayuno Americano',
        description: 'Huevos, tocino, pan tostado, café y jugo',
        sku: 'COM-002',
        price: '20.00',
        cost: '10.00',
        stock: 0,
        minStock: 0,
        trackInventory: false,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: comidaCategory!.id,
        name: 'Almuerzo Ejecutivo',
        description: 'Entrada, plato de fondo y refresco',
        sku: 'COM-003',
        price: '25.00',
        cost: '12.00',
        stock: 0,
        minStock: 0,
        trackInventory: false,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: comidaCategory!.id,
        name: 'Sandwich Club',
        description: 'Sandwich triple con papas fritas',
        sku: 'COM-004',
        price: '18.00',
        cost: '8.00',
        stock: 0,
        minStock: 0,
        trackInventory: false,
        isActive: true,
      },
      // Servicios
      {
        tenantId: createdTenant.id,
        categoryId: serviciosCategory!.id,
        name: 'Lavandería Express',
        description: 'Servicio de lavandería en 24 horas',
        sku: 'SRV-001',
        price: '30.00',
        cost: '15.00',
        stock: 0,
        minStock: 0,
        trackInventory: false,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: serviciosCategory!.id,
        name: 'Transfer Aeropuerto',
        description: 'Traslado desde/hacia el aeropuerto',
        sku: 'SRV-002',
        price: '50.00',
        cost: '25.00',
        stock: 0,
        minStock: 0,
        trackInventory: false,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: serviciosCategory!.id,
        name: 'Late Checkout',
        description: 'Extensión de horario de salida hasta las 6pm',
        sku: 'SRV-003',
        price: '40.00',
        cost: '0.00',
        stock: 0,
        minStock: 0,
        trackInventory: false,
        isActive: true,
      },
      // Minibar
      {
        tenantId: createdTenant.id,
        categoryId: minibarCategory!.id,
        name: 'Pisco Acholado 50ml',
        description: 'Botella de pisco acholado',
        sku: 'MIN-001',
        price: '15.00',
        cost: '7.00',
        stock: 60,
        minStock: 12,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: minibarCategory!.id,
        name: 'Vino Tinto Tabernero',
        description: 'Botella de vino tinto 375ml',
        sku: 'MIN-002',
        price: '25.00',
        cost: '12.00',
        stock: 40,
        minStock: 8,
        trackInventory: true,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        categoryId: minibarCategory!.id,
        name: 'Mix de Frutos Secos',
        description: 'Mezcla de nueces, almendras y pasas',
        sku: 'MIN-003',
        price: '8.00',
        cost: '4.00',
        stock: 50,
        minStock: 10,
        trackInventory: true,
        isActive: true,
      },
    ];

    const createdProducts = await productRepository.save(products);
    console.log(`✅ Created ${createdProducts.length} products`);

    // ========================================
    // ROOM TYPES
    // ========================================
    console.log('\n🌱 Seeding room types...');

    const roomTypes = [
      {
        tenantId: createdTenant.id,
        name: 'Simple',
        description: 'Habitación simple con una cama de plaza y media',
        maxOccupancy: 1,
        basePrice: '80.00',
        minimumPrice: '70.00',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Doble',
        description:
          'Habitación doble con dos camas individuales o una matrimonial',
        maxOccupancy: 2,
        basePrice: '120.00',
        minimumPrice: '100.00',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Matrimonial',
        description: 'Habitación matrimonial con cama queen size',
        maxOccupancy: 2,
        basePrice: '150.00',
        minimumPrice: '130.00',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Triple',
        description:
          'Habitación triple con tres camas o una matrimonial y una individual',
        maxOccupancy: 3,
        basePrice: '180.00',
        minimumPrice: '150.00',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Suite',
        description: 'Suite con sala de estar separada y cama king size',
        maxOccupancy: 2,
        basePrice: '250.00',
        minimumPrice: '220.00',
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        name: 'Suite Familiar',
        description: 'Suite familiar con dos habitaciones y sala de estar',
        maxOccupancy: 4,
        basePrice: '350.00',
        minimumPrice: '300.00',
        isActive: true,
      },
    ];

    const createdRoomTypes = await roomTypeRepository.save(roomTypes);
    console.log(`✅ Created ${createdRoomTypes.length} room types`);

    // ========================================
    // ROOMS
    // ========================================
    console.log('\n🌱 Seeding rooms...');

    const simpleType = createdRoomTypes.find((rt) => rt.name === 'Simple');
    const dobleType = createdRoomTypes.find((rt) => rt.name === 'Doble');
    const matrimonialType = createdRoomTypes.find(
      (rt) => rt.name === 'Matrimonial',
    );
    const tripleType = createdRoomTypes.find((rt) => rt.name === 'Triple');
    const suiteType = createdRoomTypes.find((rt) => rt.name === 'Suite');
    const suiteFamiliarType = createdRoomTypes.find(
      (rt) => rt.name === 'Suite Familiar',
    );

    const rooms = [
      // Piso 1 - Habitaciones simples y dobles
      {
        tenantId: createdTenant.id,
        roomTypeId: simpleType!.id,
        roomNumber: '101',
        floor: 1,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: simpleType!.id,
        roomNumber: '102',
        floor: 1,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: dobleType!.id,
        roomNumber: '103',
        floor: 1,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: dobleType!.id,
        roomNumber: '104',
        floor: 1,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: dobleType!.id,
        roomNumber: '105',
        floor: 1,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      // Piso 2 - Habitaciones matrimoniales y triples
      {
        tenantId: createdTenant.id,
        roomTypeId: matrimonialType!.id,
        roomNumber: '201',
        floor: 2,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: matrimonialType!.id,
        roomNumber: '202',
        floor: 2,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: matrimonialType!.id,
        roomNumber: '203',
        floor: 2,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: tripleType!.id,
        roomNumber: '204',
        floor: 2,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: tripleType!.id,
        roomNumber: '205',
        floor: 2,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      // Piso 3 - Suites
      {
        tenantId: createdTenant.id,
        roomTypeId: suiteType!.id,
        roomNumber: '301',
        floor: 3,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: suiteType!.id,
        roomNumber: '302',
        floor: 3,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: suiteFamiliarType!.id,
        roomNumber: '303',
        floor: 3,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: suiteFamiliarType!.id,
        roomNumber: '304',
        floor: 3,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      // Piso 4 - Mix de tipos
      {
        tenantId: createdTenant.id,
        roomTypeId: dobleType!.id,
        roomNumber: '401',
        floor: 4,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: dobleType!.id,
        roomNumber: '402',
        floor: 4,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: matrimonialType!.id,
        roomNumber: '403',
        floor: 4,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: matrimonialType!.id,
        roomNumber: '404',
        floor: 4,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: tripleType!.id,
        roomNumber: '405',
        floor: 4,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
      {
        tenantId: createdTenant.id,
        roomTypeId: suiteType!.id,
        roomNumber: '406',
        floor: 4,
        status: RoomStatus.AVAILABLE,
        cleaningStatus: CleaningStatus.CLEAN,
        isActive: true,
      },
    ];

    const createdRooms = await roomRepository.save(rooms);
    console.log(`✅ Created ${createdRooms.length} rooms`);

    // Summary
    console.log('\n🎉 Seeding completed successfully!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Summary:`);
    console.log(`   - Users: ${createdUsers.length}`);
    console.log(`   - Product Categories: ${createdCategories.length}`);
    console.log(`   - Products: ${createdProducts.length}`);
    console.log(`   - Room Types: ${createdRoomTypes.length}`);
    console.log(`   - Rooms: ${createdRooms.length}`);
    console.log('═══════════════════════════════════════\n');
  }
}
