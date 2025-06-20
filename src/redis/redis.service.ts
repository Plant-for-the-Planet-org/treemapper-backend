import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
      password: this.configService.get('redis.password'),
      db: this.configService.get('redis.db'),
      keyPrefix: this.configService.get('redis.keyPrefix'),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    // Handle connection events
    this.client.on('connect', () => console.log('Redis client connected'));
    this.client.on('error', (err) => console.error('Redis client error:', err));
    this.client.on('reconnecting', () => console.log('Redis client reconnecting'));
  }

  async onModuleDestroy() {
    await Promise.all([
      this.client?.quit(),
      this.subscriber?.quit(),
      this.publisher?.quit(),
    ]);
  }

  // Basic operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Hash operations for complex objects
  async hset(key: string, field: string, value: any): Promise<void> {
    await this.client.hset(key, field, JSON.stringify(value));
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    return value ? JSON.parse(value) : null;
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const result = await this.client.hgetall(key);
    const parsed: Record<string, T> = {};
    
    for (const [field, value] of Object.entries(result)) {
      parsed[field] = JSON.parse(value);
    }
    
    return parsed;
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  // Set operations for collections
  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  async srem(key: string, member: string): Promise<void> {
    await this.client.srem(key, member);
  }

  // List operations for ordered data
  async lpush(key: string, ...values: any[]): Promise<void> {
    const serializedValues = values.map(v => JSON.stringify(v));
    await this.client.lpush(key, ...serializedValues);
  }

  async rpop<T>(key: string): Promise<T | null> {
    const value = await this.client.rpop(key);
    return value ? JSON.parse(value) : null;
  }

  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const values = await this.client.lrange(key, start, stop);
    return values.map(v => JSON.parse(v));
  }

  // Pub/Sub operations
  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(JSON.parse(message));
      }
    });
  }

  // Pattern-based operations
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // Atomic operations
  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // Distributed locking
  async acquireLock(key: string, ttl: number = 10): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const identifier = Math.random().toString(36).substring(2, 15);
    
    const result = await this.client.set(lockKey, identifier, 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.client.del(lockKey);
  }

  // Health check
  async ping(): Promise<string> {
    return await this.client.ping();
  }

  // Get client for advanced operations
  getClient(): Redis {
    return this.client;
  }
}