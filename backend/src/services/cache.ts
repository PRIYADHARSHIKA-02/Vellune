import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient: Redis | null = null;
let redisConnected = false;
let connectionWarned = false;

const isProduction = process.env.NODE_ENV === 'production';

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy(times) {
      if (!isProduction && times > 3) {
        if (!connectionWarned) {
          console.warn('Redis Cache connection failed or offline. Falling back to local in-memory cache.');
          connectionWarned = true;
        }
        redisConnected = false;
        return null; // Stop reconnecting in local development to prevent log spam
      }
      return Math.min(times * 500, 5000);
    },
  });

  redisClient.on('connect', () => {
    redisConnected = true;
    console.log('[Redis] Cache connected successfully.');
  });

  redisClient.on('error', (err) => {
    redisConnected = false;
    if (!connectionWarned) {
      console.warn('Redis Cache connection failed or offline. Falling back to local in-memory cache:', err.message);
      connectionWarned = true;
    }
  });
} catch (e) {
  if (!connectionWarned) {
    console.warn('Could not initialize Redis client, falling back to local in-memory cache:', e);
    connectionWarned = true;
  }
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

// In-Memory Fallback Cache Interface & Store
interface CacheEntry {
  value: any;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

export class CacheService {
  static async get(key: string): Promise<any | null> {
    if (redisConnected && redisClient) {
      try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        // Fall back to memory cache on client error
      }
    }

    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  static async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (redisConnected && redisClient) {
      try {
        await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
        return;
      } catch (e) {
        // Fall back to memory cache on client error
      }
    }

    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static async del(key: string): Promise<void> {
    if (redisConnected && redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (e) {
        // Fall back to memory cache on client error
      }
    }

    memoryCache.delete(key);
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    if (redisConnected && redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        return;
      } catch (e) {
        // Fall back to memory cache on client error
      }
    }

    // Convert Redis wildcards to regex pattern for memory cache invalidation (e.g., 'user:123:*' -> '^user:123:.*')
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*'));
    for (const key of memoryCache.keys()) {
      if (regexPattern.test(key)) {
        memoryCache.delete(key);
      }
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
