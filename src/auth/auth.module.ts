// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { Auth0Config } from './auth0.config';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    ConfigModule,
    UsersModule,
  ],
  providers: [
    AuthService, 
    JwtStrategy, 
    Auth0Config, 
    JwtAuthGuard, // Make sure JwtAuthGuard is provided
    RolesGuard    // Make sure RolesGuard is provided
  ],
  exports: [
    AuthService,
    JwtAuthGuard, // Export JwtAuthGuard so it can be used globally
    RolesGuard    // Export RolesGuard so it can be used globally
  ],
})
export class AuthModule {}