/**
 * Redis Cache Utility
 * High-performance caching with Redis
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from './logger.js';

class RedisCache {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnect failed after 10 attempts');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('error', (err) => logger.error('Redis Client Error:', err));
    this.client.on('connect', () => logger.info('✅ Redis connected'));
    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('🚀 Redis ready');
    });
    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): RedisClientType {
    return this.client;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) return null;
      
      const value = await this.client.get(key);
      if (!value) return null;
      
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      logger.error(`Redis DEL pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (!this.isConnected) return 0;
      
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      await this.client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      if (!this.isConnected) return null;
      
      const info = await this.client.info('stats');
      return info;
    } catch (error) {
      logger.error('Redis INFO error:', error);
      return null;
    }
  }

  /**
   * Get Redis info with parsed metrics
   */
  async info(): Promise<any> {
    try {
      if (!this.isConnected) return {};
      
      const [statsInfo, memoryInfo, keyspaceInfo] = await Promise.all([
        this.client.info('stats'),
        this.client.info('memory'),
        this.client.info('keyspace'),
      ]);
      
      // Parse keyspace info to get total keys
      const keyspaceMatch = keyspaceInfo.match(/keys=(\d+)/);
      const keys = keyspaceMatch ? parseInt(keyspaceMatch[1]) : 0;
      
      // Parse memory info
      const memoryMatch = memoryInfo.match(/used_memory:(\d+)/);
      const memoryUsed = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      
      // Parse stats info for hit/miss rate
      const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
      const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);
      const keyspaceHits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
      const keyspaceMisses = missesMatch ? parseInt(missesMatch[1]) : 0;
      
      return {
        keys,
        memoryUsed,
        keyspaceHits,
        keyspaceMisses,
      };
    } catch (error) {
      logger.error('Redis INFO parsing error:', error);
      return {};
    }
  }

  /**
   * Clear all cache
   */
  async flushAll(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      await this.client.flushAll();
      logger.warn('⚠️ Redis cache cleared (FLUSHALL)');
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      return false;
    }
  }
}

// Global Redis instance
export const redisCache = new RedisCache();

// Cache key generators
export const CacheKeys = {
  listing: (id: string) => `listing:${id}`,
  listings: (params?: string) => `listings:${params || 'all'}`,
  listingsActive: () => 'listings:active',
  offer: (id: string) => `offer:${id}`,
  offers: (listingId: string) => `offers:listing:${listingId}`,
  user: (id: string) => `user:${id}`,
  userListings: (userId: string) => `user:${userId}:listings`,
  USER_OFFERS: 'offers:user', // For user's offers cache
  session: (token: string) => `session:${token}`,
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
};

// Initialize Redis connection
export async function initRedis(): Promise<{ redisClient: RedisClientType }> {
  try {
    await redisCache.connect();
    return { redisClient: redisCache.getClient() };
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    logger.warn('⚠️ Running without Redis cache');
    // Return a dummy client for graceful degradation
    throw error;
  }
}
