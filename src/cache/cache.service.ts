import { Injectable, Logger, Inject } from '@nestjs/common';
import { ICacheService } from './cache.interface';
import { RedisCacheService } from './redis-cache.service';
import { MemoryCacheService } from './memory-cache.service';
import { CacheConfig } from './cache.config';

@Injectable()
export class CacheService implements ICacheService {
  private readonly logger = new Logger(CacheService.name);
  private cacheService: ICacheService;

  constructor(
    private readonly redisCacheService: RedisCacheService,
    private readonly memoryCacheService: MemoryCacheService,
    @Inject('CACHE_CONFIG') private readonly config: CacheConfig,
  ) {
    this.initializeCacheService();
  }

  private async initializeCacheService() {
    if (this.config.type === 'redis') {
      this.logger.log('Using Redis cache');
      this.cacheService = this.redisCacheService;
    } else {
      this.logger.log('Using Memory cache');
      this.cacheService = this.memoryCacheService;
    }
  }

  // Utility methods
  buildKey(...parts: string[]): string {
    return parts.join(':');
  }

  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  async remember<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    return this.wrap(key, fn, ttl);
  }

  // Delegate all methods to the active cache service
  async get<T>(key: string): Promise<T | null> {
    return this.cacheService.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.cacheService.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    return this.cacheService.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    return this.cacheService.delByPattern(pattern);
  }

  async exists(key: string): Promise<boolean> {
    return this.cacheService.exists(key);
  }

  async increment(key: string, value?: number): Promise<number> {
    return this.cacheService.increment(key, value);
  }

  async decrement(key: string, value?: number): Promise<number> {
    return this.cacheService.decrement(key, value);
  }

  async expire(key: string, ttl: number): Promise<void> {
    return this.cacheService.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    return this.cacheService.ttl(key);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return this.cacheService.mget<T>(keys);
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    return this.cacheService.mset(keyValuePairs, ttl);
  }

  async flush(): Promise<void> {
    return this.cacheService.flush();
  }

  async keys(pattern: string): Promise<string[]> {
    return this.cacheService.keys(pattern);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.cacheService.hget(key, field);
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    return this.cacheService.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.cacheService.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    return this.cacheService.hdel(key, field);
  }

  async sadd(key: string, members: string[]): Promise<number> {
    return this.cacheService.sadd(key, members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.cacheService.smembers(key);
  }

  async srem(key: string, members: string[]): Promise<number> {
    return this.cacheService.srem(key, members);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.cacheService.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.cacheService.zrange(key, start, stop);
  }
}
