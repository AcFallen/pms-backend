# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend application for a PMS (Property Management System). This is a **multi-tenant SaaS application** that uses TypeScript and follows the standard NestJS architecture with modules, controllers, services, and decorators.

### Key Architecture Decisions
- **Multi-tenant Design**: Each entity is scoped to a tenant using `tenantId`
- **Dual ID System**: Entities use both integer IDs (primary key) and UUIDs (public_id) for external references
  - Internal IDs (`int` type) for database relations and joins
  - Public IDs (UUID) for external API references
  - Internal IDs are hidden from API responses using `@Exclude()`
- **TypeORM**: Database ORM with entity-first approach
- **Class Validator**: DTO validation with decorators
- **JWT Authentication**: Passport.js with JWT strategy for authentication
- **Security**: Sensitive fields excluded from API responses using `ClassSerializerInterceptor`

## Package Manager

This project uses **pnpm** as the package manager, not npm or yarn. Always use `pnpm` commands:
- Install dependencies: `pnpm install`
- Add packages: `pnpm add <package>`
- Add dev packages: `pnpm add -D <package>`

## Development Commands

### Running the Application
- `pnpm run start` - Start the application
- `pnpm run start:dev` - Start in watch mode (for development)
- `pnpm run start:debug` - Start with debugging enabled
- `pnpm run start:prod` - Run the production build

### Building
- `pnpm run build` - Compile TypeScript to JavaScript (output to `dist/`)

### Code Quality
- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier

### Testing
- `pnpm run test` - Run unit tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:cov` - Run tests with coverage report
- `pnpm run test:debug` - Run tests with Node debugger
- `pnpm run test:e2e` - Run end-to-end tests

## Architecture

### NestJS Module Structure
- **Modules** (`@Module()`) - Organize the application into cohesive blocks of functionality
- **Controllers** (`@Controller()`) - Handle HTTP requests and route them to services
- **Services** (`@Injectable()`) - Contain business logic and are injected via dependency injection
- **Entry Point** - [main.ts](src/main.ts) bootstraps the application using `NestFactory.create()`

### Current Structure
- `src/app.module.ts` - Root module that imports all feature modules
- `src/main.ts` - Application entry point with global pipes, guards, interceptors, and filters
- `src/common/` - Shared utilities (interceptors, filters, interfaces)
- `src/auth/` - Authentication module (JWT, Passport.js)
- `src/users/` - User management module (multi-tenant)
- `src/tenants/` - Tenant management module (organizations)
- `src/database/` - Database configuration and seeders

### Adding New Features
When adding new features, use the NestJS CLI to generate modules, controllers, and services:
- Generate module: `nest generate module <name>` or `nest g mo <name>`
- Generate controller: `nest generate controller <name>` or `nest g co <name>`
- Generate service: `nest generate service <name>` or `nest g s <name>`
- Generate complete resource: `nest generate resource <name>` or `nest g res <name>`

These commands automatically update the necessary imports and maintain the NestJS module structure.

## TypeScript Configuration

- Target: ES2023
- Module: CommonJS
- Decorators and metadata reflection are enabled (required for NestJS)
- Strict null checks are enabled
- `noImplicitAny` is disabled for flexibility

## Testing

### Unit Tests
- Located alongside source files with `.spec.ts` extension
- Use Jest as the test runner
- Coverage reports generated in `coverage/` directory

### E2E Tests
- Located in `test/` directory with `.e2e-spec.ts` extension
- Use Supertest for HTTP assertions
- Separate Jest configuration in [test/jest-e2e.json](test/jest-e2e.json)

## Code Style

The project uses ESLint with TypeScript and Prettier integration:
- Configuration: [eslint.config.mjs](eslint.config.mjs)
- Notable rules:
  - `@typescript-eslint/no-explicit-any` is turned off
  - `@typescript-eslint/no-floating-promises` is a warning
  - `@typescript-eslint/no-unsafe-argument` is a warning

## Build Output

- Development build: `dist/` directory (git-ignored)
- Build configuration: [tsconfig.build.json](tsconfig.build.json) excludes tests and node_modules

## Database

### PostgreSQL with Docker
The project uses PostgreSQL 16 running in Docker:
- Start database: `docker-compose up -d`
- Stop database: `docker-compose down`
- View logs: `docker-compose logs -f pms-postgres`
- Database connection: `localhost:5435`
- Default credentials: `postgres/postgres`
- Database name: `pms_db`

### TypeORM Configuration
- ORM: TypeORM with PostgreSQL driver
- Configuration: [src/app.module.ts](src/app.module.ts) using `TypeOrmModule.forRootAsync()`
- Environment variables: Configured in `.env` file (see `.env.example`)
- Auto-synchronization: Enabled in development (`DB_SYNCHRONIZE=true`), should be disabled in production
- Entities: Auto-loaded from `**/*.entity.ts` files

### Entity Pattern (Multi-tenant with Dual IDs)
All entities follow this pattern:
```typescript
import { Exclude } from 'class-transformer';

@Entity('table_name')
@Index(['tenantId', 'publicId'], { unique: true })
export class EntityName {
  @Exclude()  // Hide internal ID from API responses
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;  // Internal integer ID (for database relations)

  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;  // Public UUID for external references

  @Exclude()  // Hide tenantId from API responses (if not needed)
  @Column({ type: 'int', nullable: false })
  tenantId: number;  // Multi-tenant scoping

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
```

**Important Notes:**
- Use `int` for IDs (not `bigint`) - sufficient for most use cases and avoids JSON serialization issues
- Use `@Exclude()` from `class-transformer` to hide sensitive/internal fields from API responses
- Always exclude: `id` (internal), `tenantId` (internal), `passwordHash`, and relations that shouldn't be auto-loaded
- The `ClassSerializerInterceptor` in [main.ts](src/main.ts) processes `@Exclude()` decorators

### Working with Repositories
Services inject TypeORM repositories:
```typescript
constructor(
  @InjectRepository(Entity)
  private readonly repository: Repository<Entity>,
) {}
```

### Database Indexes
- Each tenant-scoped entity should have indexes on `(tenantId, publicId)` for uniqueness
- **Email uniqueness**: In User entity, email has a global unique constraint (not per tenant)
- Additional composite indexes based on query patterns (e.g., `(tenantId, role, isActive)` for Users)

### Database Seeding

The project uses `typeorm-extension` for database seeding.

#### Running Seeds
```bash
# Run all seeds (works in development, no build needed)
pnpm run seed:run
```

#### Seed Structure
- Seeds location: `src/database/seeds/`
- Main seeder: [main.seeder.ts](src/database/seeds/main.seeder.ts)
- Data source config: [data-source.ts](src/database/data-source.ts)

#### Default Seeded Data
The main seeder creates:
1. **One default tenant**: "Demo Hotel" (ID: 1)
2. **Four users** (one per role):
   - `admin@example.com` - ADMIN role
   - `manager@example.com` - MANAGER role
   - `receptionist@example.com` - RECEPTIONIST role
   - `housekeeper@example.com` - HOUSEKEEPER role

Default password for all users: `password123`

#### Creating New Seeders
```typescript
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

export default class MySeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(Entity);
    // Seeding logic here
  }
}
```

## Validation

Global validation is enabled using `class-validator` and `class-transformer`:
- Configuration: [src/main.ts](src/main.ts) with `ValidationPipe`
- DTOs use decorators: `@IsString()`, `@IsEmail()`, `@IsNotEmpty()`, etc.
- Validation settings:
  - `whitelist: true` - Strips non-whitelisted properties
  - `forbidNonWhitelisted: true` - Throws error for non-whitelisted properties
  - `transform: true` - Transforms payloads to DTO instances

## Authentication & Authorization

The application uses **JWT-based authentication with Passport.js**. All routes are protected by default.

### Key Concepts

**Two Strategies:**
1. **LocalStrategy** (`local.strategy.ts`): Validates email/password during login only
2. **JwtStrategy** (`jwt.strategy.ts`): Validates JWT tokens on all protected routes

**Three Guards:**
1. **JwtAuthGuard**: Applied globally, protects all routes by default
2. **LocalAuthGuard**: Used only on `/auth/login` endpoint
3. **RolesGuard**: Validates user roles when using `@Roles()` decorator

### Authentication Flow
1. **Login**: POST `/auth/login` with `{ email, password }`
   - LocalStrategy validates credentials against database
   - Returns JWT access token and user info
2. **Protected Routes**: Send JWT in `Authorization: Bearer <token>` header
   - JwtStrategy validates token on every request
   - Token payload includes: `userId`, `publicId`, `email`, `tenantId`, `role`
3. **Public Routes**: Use `@Public()` decorator to bypass JWT validation

### Using Authentication

#### All Routes Protected by Default
No decorator needed - JwtAuthGuard is applied globally in [main.ts:28](src/main.ts#L28):
```typescript
@Get('protected')
findAll() {
  // Automatically requires JWT token
}
```

#### Make Routes Public
Use `@Public()` decorator to skip JWT validation:
```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' }; // No JWT required
}
```

#### Access Current User
Use `@CurrentUser()` decorator to get authenticated user data:
```typescript
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@Get('profile')
getProfile(@CurrentUser() user: CurrentUserData) {
  // user = { userId, publicId, email, tenantId, role }
  return user;
}

// Get specific field
@Get('my-email')
getEmail(@CurrentUser('email') email: string) {
  return { email };
}
```

#### Restrict by Roles
Use `@Roles()` decorator with `RolesGuard`:
```typescript
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

// Only ADMIN can access
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Delete(':id')
deleteUser(@Param('id') id: string) {
  // Only accessible to ADMIN
}

// ADMIN or MANAGER can access
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Get('reports')
getReports() {
  // Accessible to ADMIN or MANAGER
}
```

### JWT Configuration
Environment variables in `.env`:
- `JWT_SECRET`: Secret key for signing tokens (change in production!)
- `JWT_EXPIRES_IN`: Token expiration (default: `1h`, can be `15m`, `7d`, etc.)

JWT Token Payload:
```typescript
{
  sub: number;        // user.id (internal)
  publicId: string;   // user.publicId (UUID)
  email: string;      // user.email
  tenantId: number;   // tenant ID for multi-tenancy
  role: string;       // UserRole (ADMIN, MANAGER, etc.)
  iat: number;        // Issued at timestamp
  exp: number;        // Expiration timestamp
}
```

### Swagger Integration
- **Lock icon 🔒**: Routes with `@ApiBearerAuth('JWT-auth')` show a lock icon
- **Authorize button**: Click green "Authorize" button in Swagger UI
- **Testing**: Login → Copy `access_token` → Authorize → Test protected routes
- **Controller-level**: Add `@ApiBearerAuth('JWT-auth')` at controller class level to protect all routes

### Important Notes
- **Email is unique globally** (not per tenant) - users cannot share emails across tenants
- **Passwords**: Hashed with bcrypt (10 rounds)
- **User status**: Inactive users (`isActive: false`) cannot login
- **lastLoginAt**: Automatically updated on successful login
- See [src/auth/README.md](src/auth/README.md) for detailed authentication documentation

## API Response Standardization

All API responses follow a standardized format using global interceptors and exception filters.

### Successful Responses (2xx)
```json
{
  "code": 200,
  "status": "successful",
  "data": { /* response data */ },
  "timestamp": "2025-11-04T06:00:00.000Z"
}
```

### Error Responses (4xx, 5xx)
```json
{
  "code": 400,
  "status": "error",
  "message": "Error description",
  "errors": ["validation error 1", "validation error 2"],
  "timestamp": "2025-11-04T06:00:00.000Z",
  "path": "/endpoint"
}
```

### Implementation
- **TransformInterceptor**: Automatically wraps successful responses
- **HttpExceptionFilter**: Handles NestJS HTTP exceptions (404, 400, 409, etc.)
- **AllExceptionsFilter**: Catches unexpected errors and logs them
- Services and controllers return data directly - transformation is automatic
- See [src/common/README.md](src/common/README.md) for detailed documentation

## API Documentation (Swagger)

Swagger/OpenAPI documentation is automatically generated and available at `/api/docs`.

### Accessing Swagger UI
- Start the application: `pnpm run start:dev`
- Navigate to: `http://localhost:3000/api/docs`
- Interactive API explorer with "Try it out" functionality

### Configuration
- Configured in [src/main.ts](src/main.ts) using `@nestjs/swagger`
- Title: "PMS API"
- Version: "1.0"
- Bearer authentication configured with JWT
- Available tags: `auth`, `users`, `tenants`

### Documenting New Endpoints

When creating new modules, document them using Swagger decorators:

#### Controller Documentation
```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('resource-name')
@Controller('resource')
export class ResourceController {
  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: Resource })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) { }
}
```

#### DTO Documentation
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({
    description: 'Field description',
    example: 'example value',
    required: true,
  })
  @IsString()
  field: string;
}
```

### Notes
- **Entities (TypeORM)**: Do NOT add `@ApiProperty` decorators - keep them clean with only TypeORM decorators
- **DTOs**: Always document with `@ApiProperty` decorators
- Use `PartialType` from `@nestjs/swagger` (not `@nestjs/mapped-types`) for Update DTOs
- Swagger automatically generates response schemas from controller return types
- Controller `@ApiResponse({ type: Entity })` is optional - Swagger infers from service return type
- Enums are documented with `enum` property in `@ApiProperty`

## Existing Modules

### Auth Module (`src/auth/`)
Handles authentication and authorization using JWT with Passport.js.

**Structure:**
- `strategies/` - LocalStrategy (login) and JwtStrategy (token validation)
- `guards/` - JwtAuthGuard (global), LocalAuthGuard (login), RolesGuard (authorization)
- `decorators/` - `@Public()`, `@CurrentUser()`, `@Roles()`
- `dto/` - LoginDto, LoginResponseDto

**Endpoints:**
- `POST /auth/login` - Login with email/password (public route)
- `GET /auth/profile` - Get current user profile (protected)

**Features:**
- JWT token generation with 1-hour expiration
- Password hashing with bcrypt (10 rounds)
- Global route protection (all routes require JWT by default)
- Multi-tenant support (tenantId in JWT payload)
- Role-based access control

**Key Files:**
- [auth.service.ts](src/auth/auth.service.ts) - Authentication logic
- [jwt.strategy.ts](src/auth/strategies/jwt.strategy.ts) - JWT token validation
- [local.strategy.ts](src/auth/strategies/local.strategy.ts) - Login credentials validation
- [README.md](src/auth/README.md) - Detailed authentication documentation

### Users Module (`src/users/`)
Multi-tenant user management with role-based access.

**Endpoints:** `/users` (full CRUD operations)

**Features:**
- User roles: ADMIN, MANAGER, RECEPTIONIST, HOUSEKEEPER
- Email uniqueness **globally** (not per tenant)
- Password hashing on creation/update
- Dual ID system (internal `id` + public `publicId`)
- `lastLoginAt` tracking

**Relations:**
- `User` belongs to `Tenant` (ManyToOne)
- Tenant relation excluded from default queries for performance

**Enums:**
- `UserRole` - Role-based access control

**Important:**
- Passwords stored as `passwordHash` (excluded from API responses)
- Internal IDs (`id`, `tenantId`) excluded from API responses
- Use `publicId` for external API references

### Tenants Module (`src/tenants/`)
Organization/tenant management for multi-tenancy.

**Endpoints:** `/tenants` (full CRUD operations)

**Features:**
- RUC validation (unique, optional)
- Tenant status: ACTIVE, SUSPENDED, CANCELLED
- Subscription plans: BASICO, STANDARD, PREMIUM
- Room capacity limits (`maxRooms`)
- Dual ID system (internal `id` + public `publicId`)
- Logo upload support (stored in `uploads/` directory)

**Relations:**
- `Tenant` has many `Users` (OneToMany)
- Users relation not auto-loaded for performance

**Enums:**
- `TenantStatus` - Tenant account status
- `TenantPlan` - Subscription tier

### Other Modules
The application includes additional feature modules following the same architectural patterns:

**Property Management:**
- `rooms/` - Room inventory management with status tracking
- `room-types/` - Room categories and configurations
- `rates/` - Pricing and rate management
- `cleaning-tasks/` - Housekeeping task management

**Guest & Reservations:**
- `guests/` - Guest/customer information management
- `reservations/` - Booking management with check-in/check-out tracking
  - Uses `timestamptz` for `checkInTime` and `checkOutTime` (timezone-aware)
  - Automatically manages room status based on reservation state

**Financial:**
- `folios/` - Guest account/folio management
- `folio-charges/` - Individual charges on folios
- `payments/` - Payment processing and tracking
- `invoices/` - Invoice generation
- `tenant-voucher-series/` - Voucher/document series management

**Inventory:**
- `products/` - Product catalog
- `product-categories/` - Product categorization

All modules follow the same patterns: multi-tenant scoping, dual ID system, TypeORM entities, validated DTOs, and Swagger documentation.

## Standard Patterns

### Service Pattern
Services handle business logic and database operations:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class EntityService {
  constructor(
    @InjectRepository(Entity)
    private readonly repository: Repository<Entity>,
  ) {}

  // Always scope by tenantId for multi-tenant isolation
  async findAllByTenant(tenantId: number): Promise<Entity[]> {
    return await this.repository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  // Use publicId for external API operations
  async findByPublicId(publicId: string, tenantId?: number): Promise<Entity> {
    const where: any = { publicId };
    if (tenantId) where.tenantId = tenantId; // Optional tenant scoping

    const entity = await this.repository.findOne({ where });
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${publicId} not found`);
    }
    return entity;
  }

  async create(dto: CreateDto, tenantId: number): Promise<Entity> {
    const entity = this.repository.create({
      ...dto,
      tenantId,
    });
    return await this.repository.save(entity);
  }

  async updateByPublicId(publicId: string, dto: UpdateDto): Promise<Entity> {
    const entity = await this.findByPublicId(publicId);
    Object.assign(entity, dto);
    return await this.repository.save(entity);
  }

  // Soft delete pattern
  async removeByPublicId(publicId: string): Promise<void> {
    const entity = await this.findByPublicId(publicId);
    await this.repository.softRemove(entity);
  }
}
```

### Controller Pattern
Controllers are thin, delegating to services:

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('resource-name')
@ApiBearerAuth('JWT-auth')
@Controller('resource')
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
  @ApiResponse({ status: 201, type: Resource })
  create(
    @Body() dto: CreateDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.create(dto, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources for tenant' })
  findAllByTenant(@CurrentUser() user: CurrentUserData) {
    return this.service.findAllByTenant(user.tenantId);
  }

  @Get(':publicId')
  @ApiOperation({ summary: 'Get resource by ID' })
  @ApiParam({ name: 'publicId', type: String, description: 'Resource UUID' })
  findOne(@Param('publicId') publicId: string) {
    return this.service.findByPublicId(publicId);
  }

  @Patch(':publicId')
  @ApiOperation({ summary: 'Update resource' })
  update(
    @Param('publicId') publicId: string,
    @Body() dto: UpdateDto,
  ) {
    return this.service.updateByPublicId(publicId, dto);
  }

  @Delete(':publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete resource' })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  remove(@Param('publicId') publicId: string) {
    return this.service.removeByPublicId(publicId);
  }
}
```

### DTO Pattern
Use `@nestjs/swagger` (not `@nestjs/mapped-types`) for Update DTOs:

```typescript
import { PartialType } from '@nestjs/swagger'; // IMPORTANT: Use @nestjs/swagger
import { CreateResourceDto } from './create-resource.dto';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {}
```

## Important Conventions

### Timestamp Fields
- **Local timestamps**: Use `timestamp` type for date fields without timezone concerns
  ```typescript
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
  ```

- **Timezone-aware timestamps**: Use `timestamptz` for fields that need timezone information
  ```typescript
  @Column({ type: 'timestamptz', nullable: true })
  checkInTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  checkOutTime: Date;
  ```

### Soft Deletes
Use TypeORM's built-in soft delete support:
```typescript
@DeleteDateColumn({ type: 'timestamp', nullable: true })
deletedAt?: Date;
```

Then use `softRemove()` or `softDelete()` methods instead of `remove()` or `delete()`.

### File Uploads
Static files are served from the `uploads/` directory:
- **Access URL**: `http://localhost:3000/uploads/`
- **Configuration**: Set up in [main.ts](src/main.ts) using `app.useStaticAssets()`
- **Example**: Tenant logo uploads stored in `uploads/logos/`

### Entity Relations
Key relationships in the system:
- **Tenant** → (OneToMany) → User, Room, RoomType, Guest, Reservation, Folio, etc.
- **User** → (ManyToOne) → Tenant
- **Room** → (ManyToOne) → RoomType, Tenant
- **Reservation** → (ManyToOne) → Guest, Room, RoomType, Tenant
- **Reservation** → (OneToMany) → Folio
- **Folio** → (ManyToOne) → Reservation
- **Folio** → (OneToMany) → FolioCharge, Payment

**Important**: Relations should use `@Exclude()` decorator and not be auto-loaded for performance:
```typescript
@Exclude()
@ManyToOne(() => Tenant, { nullable: false })
@JoinColumn({ name: 'tenantId' })
tenant: Tenant;
```

## Best Practices Checklist

When implementing new features, ensure:
- [ ] Entity uses dual ID system (`id` + `publicId`)
- [ ] Entity is scoped to `tenantId`
- [ ] Sensitive fields use `@Exclude()` decorator
- [ ] Indexes on `(tenantId, publicId)` and common query patterns
- [ ] Service methods filter by `tenantId`
- [ ] Controller uses `publicId` in URL parameters
- [ ] DTOs documented with `@ApiProperty`
- [ ] Controller documented with `@ApiTags`, `@ApiOperation`
- [ ] Use `@CurrentUser()` to access authenticated user
- [ ] Validation decorators on all DTO fields
- [ ] Update DTOs use `PartialType` from `@nestjs/swagger`
- [ ] Use `int` for ID types (not `bigint`)
- [ ] Use `timestamptz` for timezone-aware date fields
- [ ] Relations use `@Exclude()` and not auto-loaded
