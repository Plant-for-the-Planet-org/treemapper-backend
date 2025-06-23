// src/cache/cache.service.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';



@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT for key: ${key}`);
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET for key: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DELETE for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // This works with Redis store
      const store = (this.cacheManager as any).store;
      if (typeof store.keys === 'function') {
        const keys = await store.keys(pattern);
        if (keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
          this.logger.debug(`Cache DELETE pattern: ${pattern}, deleted ${keys.length} keys`);
        }
      } else {
        this.logger.warn('Cache store does not support keys(pattern) method.');
      }
    } catch (error) {
      this.logger.error(`Cache DELETE pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      // Access the underlying store
      const store = (this.cacheManager as any).store;

      if (!store) {
        this.logger.warn('Cache store is not accessible');
        return;
      }

      // Method 1: Try store.reset()
      if (typeof store.reset === 'function') {
        await store.reset();
        this.logger.debug('Cache RESET (store.reset) - all keys deleted');
        return;
      }

      // Method 2: Try to get all keys and delete them
      if (typeof store.keys === 'function') {
        const keys = await store.keys('*');
        this.logger.debug(`Found ${keys.length} keys to delete`);

        if (keys.length > 0) {
          // Delete keys in batches
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await Promise.all(batch.map((key: string) => this.cacheManager.del(key)));
          }
          this.logger.debug(`Cache RESET - deleted ${keys.length} keys`);
          return;
        } else {
          this.logger.debug('Cache RESET - no keys to delete');
          return;
        }
      }

      // Method 3: Try Redis flushdb if it's a Redis store
      if (store.client && typeof store.client.flushdb === 'function') {
        await store.client.flushdb();
        this.logger.debug('Cache RESET (Redis flushdb) - all keys deleted');
        return;
      }

      // Method 4: Try store.clear()
      if (typeof store.clear === 'function') {
        await store.clear();
        this.logger.debug('Cache RESET (store.clear) - all keys deleted');
        return;
      }

      this.logger.warn('Cache store does not support any clear/reset methods');
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
      throw error;
    }
  }
  /**
   * Get or set pattern - if key doesn't exist, call factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    try {
      let value = await this.get<T>(key);

      if (value === null) {
        value = await factory();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      }

      return value;
    } catch (error) {
      this.logger.error(`Cache GET_OR_SET error for key ${key}:`, error);
      // Fallback to factory function if cache fails
      try {
        return await factory();
      } catch (factoryError) {
        this.logger.error(`Factory function error for key ${key}:`, factoryError);
        return null;
      }
    }
  }
}