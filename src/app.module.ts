import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisCacheModule } from './redis/redis.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MemoryCacheMoudle } from './cache/cache.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisCacheModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    MemoryCacheMoudle
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }