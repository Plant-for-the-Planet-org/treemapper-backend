import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';
import { CACHE_KEY, CACHE_TTL } from './cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY, context.getHandler());
    const cacheTtl = this.reflector.get<number>(CACHE_TTL, context.getHandler());

    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const key = this.buildCacheKey(cacheKey, request);

    // Try to get from cache
    const cachedResult = await this.cacheService.get(key);
    if (cachedResult !== null) {
      return of(cachedResult);
    }

    // Execute method and cache result
    return next.handle().pipe(
      tap(async (result) => {
        await this.cacheService.set(key, result, cacheTtl);
      }),
    );
  }

  private buildCacheKey(template: string, request: any): string {
    // Replace placeholders in template with request data
    return template
      .replace(':userId', request.user?.id || 'anonymous')
      .replace(':method', request.method)
      .replace(':url', request.url);
  }
}