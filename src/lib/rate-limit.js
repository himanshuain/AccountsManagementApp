/**
 * Simple in-memory rate limiter for serverless environments
 *
 * Note: This is reset when the serverless function cold starts.
 * For a production app with more users, consider using Redis-based rate limiting.
 */

// Store for rate limit data: Map<identifier, { count, resetTime }>
const rateLimitStore = new Map();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if an identifier has exceeded the rate limit
 * @param {string} identifier - Unique identifier (e.g., IP address)
 * @param {Object} options - Rate limit options
 * @param {number} options.limit - Maximum requests allowed in the window
 * @param {number} options.windowMs - Time window in milliseconds
 * @returns {{ success: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(identifier, { limit = 5, windowMs = 60000 } = {}) {
  cleanupExpired();

  const now = Date.now();
  const data = rateLimitStore.get(identifier);

  // If no previous record or window expired, start fresh
  if (!data || data.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  // Check if limit exceeded
  if (data.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: data.resetTime,
      retryAfter: Math.ceil((data.resetTime - now) / 1000),
    };
  }

  // Increment count
  data.count++;
  return {
    success: true,
    remaining: limit - data.count,
    resetTime: data.resetTime,
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 * @param {string} identifier - Unique identifier to reset
 */
export function resetRateLimit(identifier) {
  rateLimitStore.delete(identifier);
}

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and standard proxies
 * @param {Request} request - The incoming request
 * @returns {string} - Client IP address
 */
export function getClientIp(request) {
  // Try various headers in order of preference
  const headers = request.headers;

  // Vercel
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  // Cloudflare
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Standard
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback
  return "unknown";
}

export default {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
};
