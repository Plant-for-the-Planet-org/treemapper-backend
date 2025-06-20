import { Injectable, Logger } from '@nestjs/common';
import { ICacheService } from './cache.interface';
import { CacheConfig } from './cache.config';

interface CacheItem<T> {
  value: T;
  expiry: number;
}

@Injectable()
export class MemoryCacheService implements ICacheService {
  private readonly logger = new Logger(MemoryCacheService.name);
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly config: CacheConfig) {
    // Start cleanup interval every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    
    this.logger.log('Memory cache initialized with 30-minute TTL');
  }

  private cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired items`);
    }
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() > item.expiry;
  }

  private getExpiryTime(ttl?: number): number {
    const ttlMs = ttl ? ttl * 1000 : (this.config.memory?.ttl ?? 30 * 60 * 1000); // default to 30 minutes if undefined
    return Date.now() + ttlMs;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = this.getExpiryTime(ttl);
    
    // Check if we need to remove old items to make space
    if (this.config.memory && typeof this.config.memory.max === 'number' && this.cache.size >= this.config.memory.max) {
      this.cleanup();
      
      // If still at max, remove oldest items
      if (this.cache.size >= this.config.memory.max) {
        const keysToRemove = Array.from(this.cache.keys()).slice(0, Math.floor(this.config.memory.max * 0.1));
        keysToRemove.forEach(k => this.cache.delete(k));
      }
    }

    this.cache.set(key, { value, expiry });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete = Array.from(this.cache.keys()).filter(key => regex.test(key));
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async exists(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async increment(key: string, value: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + value;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, value: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current - value;
    await this.set(key, newValue);
    return newValue;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const item = this.cache.get(key);
    if (item && !this.isExpired(item)) {
      item.expiry = this.getExpiryTime(ttl);
    }
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);
    
    if (!item || this.isExpired(item)) {
      return -1;
    }

    return Math.floor((item.expiry - Date.now()) / 1000);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    const promises = Object.entries(keyValuePairs).map(([key, value]) => 
      this.set(key, value, ttl)
    );
    await Promise.all(promises);
  }

  async flush(): Promise<void> {
    this.cache.clear();
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  // Hash operations (simulated with JSON)
  async hget(key: string, field: string): Promise<string | null> {
    const hash = await this.get<Record<string, any>>(key);
    return hash && hash[field] ? JSON.stringify(hash[field]) : null;
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    const hash = await this.get<Record<string, any>>(key) || {};
    hash[field] = value;
    await this.set(key, hash);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = await this.get<Record<string, any>>(key) || {};
    const result: Record<string, string> = {};
    
    for (const [field, value] of Object.entries(hash)) {
      result[field] = JSON.stringify(value);
    }
    
    return result;
  }

  async hdel(key: string, field: string): Promise<void> {
    const hash = await this.get<Record<string, any>>(key);
    if (hash && hash[field]) {
      delete hash[field];
      await this.set(key, hash);
    }
  }

  // Set operations (simulated with arrays)
  async sadd(key: string, members: string[]): Promise<number> {
    const set = new Set(await this.get<string[]>(key) || []);
    const initialSize = set.size;
    
    members.forEach(member => set.add(member));
    await this.set(key, Array.from(set));
    
    return set.size - initialSize;
  }

  async smembers(key: string): Promise<string[]> {
    return await this.get<string[]>(key) || [];
  }

  async srem(key: string, members: string[]): Promise<number> {
    const set = new Set(await this.get<string[]>(key) || []);
    const initialSize = set.size;
    
    members.forEach(member => set.delete(member));
    await this.set(key, Array.from(set));
    
    return initialSize - set.size;
  }

  // Sorted set operations (simulated with array of objects)
  async zadd(key: string, score: number, member: string): Promise<number> {
    const sortedSet = await this.get<Array<{score: number, member: string}>>(key) || [];
    const existingIndex = sortedSet.findIndex(item => item.member === member);
    
    if (existingIndex >= 0) {
      sortedSet[existingIndex].score = score;
    } else {
      sortedSet.push({ score, member });
    }
    
    sortedSet.sort((a, b) => a.score - b.score);
    await this.set(key, sortedSet);
    
    return existingIndex >= 0 ? 0 : 1;
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const sortedSet = await this.get<Array<{score: number, member: string}>>(key) || [];
    return sortedSet.slice(start, stop + 1).map(item => item.member);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.logger.log('Memory cache destroyed');
  }
}