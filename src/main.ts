import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*', // For development TODO: Need to update it for production
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  // Security Middleware
  // app.use(helmet());
  // app.use(compression());


  // Global Prefix (optional)
  app.setGlobalPrefix('api');


  app.use((req, res, next) => {
    Logger.log(`${req.method} ${req.originalUrl}`, 'RequestLog');
    next();
  });
  // // Global Pipes
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true, // Strip properties that don't have decorators
  //     transform: true, // Transform payloads to DTO instances
  //     forbidNonWhitelisted: true, // Throw errors if non-whitelisted values are provided
  //     transformOptions: {
  //       enableImplicitConversion: true, // Automatically transform primitive types
  //     },
  //   }),
  // );

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TreeMapper Backend')
      .setDescription('Internal Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Start the server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  
  console.error('Application failed to start:', error);
  process.exit(1);
});