import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = false

        if (isProduction) {
          // Redis configuration for production
          //   return {
          //     store: redisStore,
          //     host: configService.get('REDIS_HOST', 'localhost'),
          //     port: configService.get('REDIS_PORT', 6379),
          //     password: configService.get('REDIS_PASSWORD'),
          //     db: configService.get('REDIS_DB', 0),
          //     ttl: 900, // 15 minutes default TTL
          //     max: 1000, // Maximum number of items in cache
          //   };
        } else {
          // In-memory cache for development
          return {
            store: 'memory', // Explicitly set memory store
            ttl: 900, // 15 minutes
            max: 100, // Maximum number of items in cache
          };
        }
      },
      inject: [ConfigService],
      isGlobal: true, // Makes cache available globally
    }),
  ],
  providers: [CacheService], // Add CacheService as a provider
  exports: [CacheService],
})
export class AppCacheModule { }