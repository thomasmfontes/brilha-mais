import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create application
  const app = await NestFactory.create(AppModule);
  // Enable CORS
  app.enableCors();

  // Serve static files from public directory
  // Use process.cwd() for reliable public folder resolution in different environments
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  const port = process.env.PORT ?? 3000;

  // Global Exception Handlers for Process
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception thrown:', err);
  });

  await app.listen(port);
  logger.log(`🚀 API is running on: http://localhost:${port}`);
}
bootstrap();
