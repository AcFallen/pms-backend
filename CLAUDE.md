# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS backend application for a PMS (Property Management System). This is a **multi-tenant SaaS application** that uses TypeScript and follows the standard NestJS architecture with modules, controllers, services, and decorators.

### Key Architecture Decisions
- **Multi-tenant Design**: Each entity is scoped to a tenant using `tenantId`
- **Dual ID System**: Entities use both integer IDs (primary key) and UUIDs (public_id) for external references
- **TypeORM**: Database ORM with entity-first approach
- **Class Validator**: DTO validation with decorators

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
- `src/app.controller.ts` - Root controller with basic routes
- `src/app.service.ts` - Root service with business logic
- `src/main.ts` - Application entry point (defaults to port 3000, or `process.env.PORT`)

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
@Entity('table_name')
@Index(['tenantId', 'publicId'], { unique: true })
export class EntityName {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;  // Internal integer ID

  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  publicId: string;  // Public UUID for external references

  @Column({ type: 'bigint', nullable: false })
  tenantId: number;  // Multi-tenant scoping

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
```

### Working with Repositories
Services inject TypeORM repositories:
```typescript
constructor(
  @InjectRepository(Entity)
  private readonly repository: Repository<Entity>,
) {}
```

### Database Indexes
- Each tenant-scoped entity should have indexes on `(tenantId, publicId)` and `(tenantId, email)` for uniqueness
- Additional composite indexes based on query patterns

## Validation

Global validation is enabled using `class-validator` and `class-transformer`:
- Configuration: [src/main.ts](src/main.ts) with `ValidationPipe`
- DTOs use decorators: `@IsString()`, `@IsEmail()`, `@IsNotEmpty()`, etc.
- Validation settings:
  - `whitelist: true` - Strips non-whitelisted properties
  - `forbidNonWhitelisted: true` - Throws error for non-whitelisted properties
  - `transform: true` - Transforms payloads to DTO instances
