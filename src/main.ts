import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  TransformInterceptor,
  HttpExceptionFilter,
  AllExceptionsFilter,
} from './common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Apply global interceptor to standardize successful responses
  app.useGlobalInterceptors(new TransformInterceptor());

  // Apply global exception filters to standardize error responses
  // Order matters: more specific filters should come before general ones
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
