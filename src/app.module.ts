import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { DatabaseModule } from './database/database.module';
// import { UsersModule } from './users/users.module';
import { CacheModule } from './cache/cache.module';
// import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        type: configService.get<'redis' | 'memory'>('CACHE_TYPE') || 'memory',
        redis: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: Number(configService.get<string>('REDIS_PORT')) || 6379,
          password: configService.get<string>('REDIS_PASSWORD') || '',
        },
        defaultTtl: 300,
      }),
      inject: [ConfigService],
    }),
    // DatabaseModule,
    // AuthModule,
    // UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }