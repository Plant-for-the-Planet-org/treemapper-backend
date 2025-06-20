import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { RedisService } from './redis.service';
import { BullModule } from '@nestjs/bull';

@Global()
@Module({
  imports: [
    // Cache Manager for general caching
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        password: configService.get('redis.password'),
        db: configService.get('redis.db'),
        keyPrefix: configService.get('redis.keyPrefix'),
        ttl: configService.get('redis.ttl'),
        max: 1000, // Maximum number of items in cache
        retry_strategy: (options: any) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        },
      }),
      inject: [ConfigService],
    }),
    
    // BullMQ for job queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db') + 1, // Use different DB for queues
          keyPrefix: `${configService.get('redis.keyPrefix')}bull:`,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
          lazyConnect: true,
        },
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService, BullModule],
})
export class RedisModule {}