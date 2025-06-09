// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // CRITICAL: Add body parser limits FIRST, before any other middleware
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

    // Global interceptors for response formatting
    app.useGlobalInterceptors(new ResponseInterceptor());

    // Global filters for error handling
    app.useGlobalFilters(new HttpExceptionFilter());

    // API prefix
    app.setGlobalPrefix('api');

    // Validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Global JWT guard (with public route exclusions)
    const jwtGuard = app.get(JwtAuthGuard);
    app.useGlobalGuards(jwtGuard);

    // Swagger setup - Only in development or if explicitly enabled
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
      const config = new DocumentBuilder()
        .setTitle('TreeMapper API')
        .setDescription('The TreeMapper Backend API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
      logger.log('Swagger documentation available at /api/docs');
    }

    // Use Heroku's dynamic port, bind to all interfaces
    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');

    // Log the correct URL based on environment
    const baseUrl = process.env.NODE_ENV === 'production'
      ? `https://treemapper-backend-abb922f4cbd0.herokuapp.com`
      : `http://localhost:${port}`;

    logger.log(`🚀 Application is running on: ${baseUrl}`);
    logger.log(`📚 API Documentation: ${baseUrl}/api/docs`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  } catch (error) {
    logger.error('❌ Error starting the application:', error);
    process.exit(1);
  }
}

bootstrap();