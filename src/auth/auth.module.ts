import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { DrizzleService } from '../database/database.service';
import { DatabaseModule } from '../database/database.module';


@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    UsersModule, // Add UsersModule to importsm,
    DatabaseModule
  ],
  providers: [
    JwtStrategy,
    DrizzleService, // Add DrizzleService to providers
  ],
  exports: [PassportModule],
})
export class AuthModule {}