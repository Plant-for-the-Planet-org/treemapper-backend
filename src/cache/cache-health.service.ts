import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheHealthService {
  constructor(private readonly cacheService: CacheService) {}

  async checkHealth(): Promise<{ status: string; details: any }> {
    try {
      const testKey = 'health_check';
      const testValue = { timestamp: Date.now() };
      
      // Test write
      await this.cacheService.set(testKey, testValue, 10);
      
      // Test read
      const retrieved = await this.cacheService.get(testKey);
      
      // Test delete
      await this.cacheService.del(testKey);
      
      if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
        return {
          status: 'healthy',
          details: {
            read: true,
            write: true,
            delete: true,
          },
        };
      } else {
        return {
          status: 'unhealthy',
          details: {
            error: 'Data integrity check failed',
          },
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
        },
      };
    }
  }
}