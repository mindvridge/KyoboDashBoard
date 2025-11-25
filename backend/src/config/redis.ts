import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis error', err);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redis;
}

export async function connectRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    logger.info('Redis connection successful');
    return true;
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache', error);
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Cache utilities
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.warn('Cache get failed', { key, error });
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    const client = getRedisClient();
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.warn('Cache set failed', { key, error });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    logger.warn('Cache delete failed', { key, error });
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    const keys: string[] = [];
    let cursor = '0';

    // Use SCAN instead of KEYS for better performance
    // SCAN is non-blocking and doesn't freeze Redis on large datasets
    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    // Delete keys in batches to avoid blocking
    if (keys.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await client.del(...batch);
      }
      logger.debug('Cache invalidated', { pattern, count: keys.length });
    }
  } catch (error) {
    logger.warn('Cache invalidate pattern failed', { pattern, error });
  }
}
