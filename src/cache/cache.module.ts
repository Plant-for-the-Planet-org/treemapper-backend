import { Module, DynamicModule } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisCacheService } from './redis-cache.service';
import { MemoryCacheService } from './memory-cache.service';
import { CacheConfig } from './cache.config';

@Module({})
export class CacheModule {
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<CacheConfig> | CacheConfig;
    inject?: any[];
  }): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        {
          provide: 'CACHE_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: RedisCacheService,
          useFactory: (config: CacheConfig) => new RedisCacheService(config),
          inject: ['CACHE_CONFIG'],
        },
        {
          provide: MemoryCacheService,
          useFactory: (config: CacheConfig) => new MemoryCacheService(config),
          inject: ['CACHE_CONFIG'],
        },
        CacheService,
      ],
      exports: [CacheService],
      global: true,
    };
  }
}