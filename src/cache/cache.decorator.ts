import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache';
export const CACHE_TTL = 'cache_ttl';

export const Cache = (key: string, ttl?: number) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, key)(target, propertyName, descriptor);
    if (ttl) {
      SetMetadata(CACHE_TTL, ttl)(target, propertyName, descriptor);
    }
  };
};

