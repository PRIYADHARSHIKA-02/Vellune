import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redis: Redis | null = null;

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
  });

  redis.on('error', (err) => {
    // Fail silently in development so local dev doesn't crash if Redis is offline
    console.warn('Redis Cache not running or connection failed:', err.message);
  });
} catch (e) {
  console.warn('Could not initialize Redis client:', e);
}

export const CACHE_KEYS = {
  USER_BOOKS: (userId: string) => `user:${userId}:books`,
  BOOK_DETAILS: (bookId: string) => `book:${bookId}`,
  READING_STATS: (userId: string) => `stats:${userId}`,
  RECOMMENDATIONS: (userId: string) => `recs:${userId}`,
  ACTIVE_SESSION: (userId: string) => `session:${userId}:active`,
};

export const CACHE_TTL = {
  USER_BOOKS: 300,        // 5 minutes
  BOOK_DETAILS: 3600,     // 1 hour
  READING_STATS: 1800,    // 30 minutes
  RECOMMENDATIONS: 7200,  // 2 hours
  ACTIVE_SESSION: 60,     // 1 minute
};

export class CacheService {
  static async get(key: string): Promise<any | null> {
    if (!redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!redis) return;
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (e) {
      // Fail-safe
    }
  }

  static async del(key: string): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (e) {
      // Fail-safe
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    if (!redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (e) {
      // Fail-safe
    }
  }

  static async getOrFetch<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached as T;
    }
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
