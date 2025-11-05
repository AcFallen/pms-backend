import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  TransformInterceptor,
  HttpExceptionFilter,
  AllExceptionsFilter,
} from './common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get Reflector instance for guards
  const reflector = app.get(Reflector);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // Apply JWT Auth Guard globally (protects all routes by default)
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Apply Roles Guard globally (for role-based authorization)
  const RolesGuard = require('./auth/guards/roles.guard').RolesGuard;
  app.useGlobalGuards(new RolesGuard(reflector));

  // Apply ClassSerializerInterceptor first to handle @Exclude decorators
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Apply global interceptor to standardize successful responses
  app.useGlobalInterceptors(new TransformInterceptor());

  // Apply global exception filters to standardize error responses
  // Order matters: more specific filters should come before general ones
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('PMS API')
    .setDescription('Property Management System - Multi-tenant SaaS API')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('tenants', 'Tenant management endpoints')
    .addTag('folios', 'Folio management endpoints')
    .addTag('folio-charges', 'Folio charge management endpoints')
    .addTag('payments', 'Payment management endpoints')
    .addTag('invoices', 'Invoice management endpoints')
    .addTag('room-types', 'Room type management endpoints')
    .addTag('rooms', 'Room management endpoints')
    .addTag('rates', 'Rate management endpoints')
    .addTag('guests', 'Guest management endpoints')
    .addTag('reservations', 'Reservation management endpoints')
    .addTag('cleaning-tasks', 'Cleaning task management endpoints')
    .addTag('product-categories', 'Product category management endpoints')
    .addTag('products', 'Product management endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
