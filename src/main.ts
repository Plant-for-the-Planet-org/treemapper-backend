// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        logger: true, // Enable Fastify's built-in logger
        // Fastify options
        bodyLimit: 10485760, // 10MB
        caseSensitive: false,
        ignoreTrailingSlash: true,
      })
    );


    // CORS Configuration - Move this to the very beginning
    app.enableCors({
      origin: [
        'https://treemapper-dashboard-1944c398f284.herokuapp.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://localhost:3000', // In case of HTTPS locally
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
      ],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });


    // API prefix
    app.setGlobalPrefix('api');

    // Global interceptors for response formatting
    app.useGlobalInterceptors(new ResponseInterceptor());

    // Global filters for error handling
    app.useGlobalFilters(new HttpExceptionFilter());

    // Validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Global JWT guard (with public route exclusions)
    // const jwtGuard = app.get(JwtAuthGuard);
    // app.useGlobalGuards(jwtGuard);

    // Swagger setup
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

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');

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