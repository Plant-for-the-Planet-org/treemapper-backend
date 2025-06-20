export interface CacheConfig {
    type: 'redis' | 'memory';
    redis?: {
        host: string;
        port: number;
        password?: string;
        db?: number;
        keyPrefix?: string;
        retryDelayOnFailover?: number;
        maxRetriesPerRequest?: number;
    };
    memory?: {
        max: number;
        ttl: number;
    };
    defaultTtl: number;
}

export const cacheConfig: CacheConfig = {
    type: process.env.CACHE_TYPE as 'redis' | 'memory' || 'redis',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || "") || 0,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
    },
    memory: {
        max: 1000, // Maximum number of items in memory
        ttl: 30 * 60 * 1000, // 30 minutes in milliseconds
    },
    defaultTtl: 5 * 60, // 5 minutes in seconds
};
