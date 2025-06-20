import { Injectable } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly cacheService: CacheService) {}

  async checkRateLimit(
    identifier: string, 
    maxRequests: number = 100, 
    windowMs: number = 3600
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.cacheService.buildKey('rate_limit', identifier);
    
    const current = await this.cacheService.get<number>(key) || 0;
    const remaining = Math.max(0, maxRequests - current - 1);
    
    if (current >= maxRequests) {
      const ttl = await this.cacheService.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + (ttl * 1000),
      };
    }

    // Increment counter
    if (current === 0) {
      // First request in window
      await this.cacheService.set(key, 1, windowMs);
    } else {
      await this.cacheService.increment(key);
    }

    const ttl = await this.cacheService.ttl(key);
    return {
      allowed: true,
      remaining,
      resetTime: Date.now() + (ttl * 1000),
    };
  }
}
