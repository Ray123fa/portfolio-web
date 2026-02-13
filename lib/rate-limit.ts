/**
 * Simple in-memory rate limiter for API routes
 * Tracks requests per IP with a sliding window
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  __rateLimitMap?: Map<string, RateLimitEntry>;
};

const rateLimitMap =
  globalForRateLimit.__rateLimitMap ??
  (globalForRateLimit.__rateLimitMap = new Map<string, RateLimitEntry>());

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (typically IP address)
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  // Reset if window expired
  if (!existing || existing.resetAt <= now) {
    const entry: RateLimitEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    rateLimitMap.set(key, entry);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Within window
  existing.count += 1;

  if (existing.count > options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: options.maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Extract client IP from Next.js request headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
