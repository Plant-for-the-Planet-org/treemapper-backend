// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  

   app.useGlobalPipes(new ValidationPipe());
  
  // Global interceptors for response formatting
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Global filters for error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api');
  
  // Validation pipe
  app.useGlobalPipes(new ValidationPipe());
  
  // Global JWT guard (with public route exclusions)
  const jwtGuard = app.get(JwtAuthGuard);
  app.useGlobalGuards(jwtGuard);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('The NestJS API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();