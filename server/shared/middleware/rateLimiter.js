/**
 * SwiftCare Lightweight In-Memory Sliding-Window Rate Limiter
 *
 * Enforces request throttling for state mutations and AI analysis
 * while preserving high-throughput channels for real-time emergency telemetry.
 */

export function createRateLimiter(options = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    max = 100,             // max requests per window
    message = 'Too many requests from this IP, please try again later.',
    statusCode = 429,
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-client'
  } = options;

  // Key -> Array of timestamps
  const hits = new Map();

  // Periodic cleanup of stale entries to prevent memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const validTimestamps = timestamps.filter(t => now - t < windowMs);
      if (validTimestamps.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, validTimestamps);
      }
    }
  }, Math.max(windowMs, 30000));

  // Do not hold process alive on cleanup timer
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Allow bypassing rate limits during automated tests or if explicitly disabled
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMITS === 'true') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const timestamps = hits.get(key) || [];

    // Filter timestamps within current window
    const recentHits = timestamps.filter(t => now - t < windowMs);

    if (recentHits.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(statusCode).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message
      });
    }

    recentHits.push(now);
    hits.set(key, recentHits);
    next();
  };
}

// 2. High-cost AI GeoAgent analysis limiter (30 per min)
export const aiAnalysisRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'AI reasoning request limit reached. Please wait before requesting another analysis.'
});

// 3. General mutation limiter for non-telemetry sensitive endpoints (120 per min)
export const mutationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'State modification rate limit reached. Please throttle requests.'
});
