import Redis from 'ioredis';
import { env } from './env';

export const redisConnection = {
  host: env.redisHost,
  port: env.redisPort,
  maxRetriesPerRequest: null, // Required for BullMQ
};

// Shared Redis client for general use (rate-limiting counters, etc.)
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: env.redisHost,
      port: env.redisPort,
      maxRetriesPerRequest: null,
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
