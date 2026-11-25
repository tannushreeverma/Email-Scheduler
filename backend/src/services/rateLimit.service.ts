import { getRedisClient } from '../config/redis';
import { env } from '../config/env';
import type { RateLimitResult } from '../types';

/**
 * Rate-limiting service backed by Redis.
 *
 * Strategy:
 *  - Each sender has an hourly counter stored in Redis:
 *      key   = `rate_limit:<sender>:<hourWindow>`
 *      value = number of emails sent this hour
 *  - The hour window is a simple floor: `Math.floor(Date.now() / 3600000)`
 *  - Keys auto-expire after 2 hours.
 *
 * When the limit is reached the caller (worker) delays the job to the
 * start of the next hour window instead of dropping it.
 */
class RateLimitService {
  /**
   * Try to consume one send credit for `sender` in the current hour.
   * Returns { allowed, remaining, retryAfterMs }.
   */
  async tryConsume(sender: string): Promise<RateLimitResult> {
    const redis = getRedisClient();
    const hourWindow = Math.floor(Date.now() / 3_600_000);
    const key = `rate_limit:${sender}:${hourWindow}`;
    const limitKey = `rate_limit_config:${sender}`;

    // Get the per-sender limit, fall back to global
    const customLimit = await redis.get(limitKey);
    const limit = customLimit ? parseInt(customLimit, 10) : env.maxEmailsPerHour;

    // Atomic increment + TTL
    const current = await redis.incr(key);
    if (current === 1) {
      // First hit this window – set expiry to 2 hours (safety margin)
      await redis.expire(key, 7200);
    }

    if (current > limit) {
      // Undo the increment so the counter stays at the limit
      await redis.decr(key);

      // Calculate ms until the next hour window opens
      const nextWindowStart = (hourWindow + 1) * 3_600_000;
      const retryAfterMs = nextWindowStart - Date.now();

      return { allowed: false, remaining: 0, retryAfterMs };
    }

    return {
      allowed: true,
      remaining: limit - current,
      retryAfterMs: 0,
    };
  }

  /**
   * Store a per-sender hourly limit override in Redis.
   */
  async setSenderHourlyLimit(sender: string, limit: number): Promise<void> {
    const redis = getRedisClient();
    const key = `rate_limit_config:${sender}`;
    await redis.set(key, limit.toString());
  }

  /**
   * Get the current count for a sender in this hour window.
   */
  async getCurrentCount(sender: string): Promise<number> {
    const redis = getRedisClient();
    const hourWindow = Math.floor(Date.now() / 3_600_000);
    const key = `rate_limit:${sender}:${hourWindow}`;
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Check if a sender has reached their hourly limit without consuming.
   */
  async isLimitReached(sender: string): Promise<boolean> {
    const redis = getRedisClient();
    const hourWindow = Math.floor(Date.now() / 3_600_000);
    const key = `rate_limit:${sender}:${hourWindow}`;
    const limitKey = `rate_limit_config:${sender}`;

    const [countStr, customLimit] = await Promise.all([
      redis.get(key),
      redis.get(limitKey),
    ]);

    const count = countStr ? parseInt(countStr, 10) : 0;
    const limit = customLimit ? parseInt(customLimit, 10) : env.maxEmailsPerHour;

    return count >= limit;
  }
}

export const rateLimitService = new RateLimitService();
