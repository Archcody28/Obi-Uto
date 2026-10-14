// Simple in-memory rate limiter
// For production, consider using redis or a dedicated rate-limiting service

const rateLimit = (options = {}) => {
  // Each limiter instance gets its own store so the auth, payment and
  // general API limiters never consume each other's request budgets.
  const rateLimitStore = new Map();
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // max requests per window
    message = "Too many requests, please try again later.",
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    skip = null, // Phase 30.3: optional (req) => boolean to exempt paths
  } = options;

  return (req, res, next) => {
    if (typeof skip === "function") {
      try {
        if (skip(req)) return next();
      } catch (_err) { /* fall through to normal limiting */ }
    }
    const key = keyGenerator(req);
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    const record = rateLimitStore.get(key);

    // Reset if window has passed
    if (now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    // Check limit
    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        message,
        retryAfter,
      });
    }

    record.count++;
    next();
  };
};

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: "Too many authentication attempts. Please try again later.",
});

// Stricter limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 payment operations per hour
  message: "Too many payment requests. Please try again later.",
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: "Too many requests. Please slow down.",
});

/*
 * Phase 30.3 — targeted live-polling budget.
 * Proven 429 cause: the shared apiLimiter (100 req / 15 min per IP) is shared
 * by EVERY /api/* route on one phone IP. CreateLiveStreamScreen polls
 * GET /mine every 5s (12/min), LiveCameraScreen polls GET /status/:id every
 * 2s during connect (30/min) plus heartbeat POSTs — a few studio screens plus
 * Metro asset/proxy traffic on the same IP exhausts 100 quickly, and the
 * throttled owner-status poll then blocks "server confirmed" forever.
 * Fix: a dedicated per-route limiter (300 / 60s) ONLY for the three polling
 * endpoints, wired ahead of the shared apiLimiter. Global limits untouched.
 */
const livePollLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 polling hits per minute per IP (5/sec sustained)
  message: "Too many live-status requests. Backing off briefly.",
});

/* Phase 30.6: explicit creator-action budget (create/ingest/start/end/update).
 * Polling/heartbeat stay on livePollLimiter; one-shot actions must never share
 * a budget with high-frequency polls, and must be exempted from the shared
 * 100/15min apiLimiter (see index.js) so End Live can never 429 after a long
 * broadcast on one phone IP. 60/min per IP is generous for taps, still bounded. */
const liveActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 explicit creator actions per minute per IP (1/sec sustained)
  message: "Too many live actions. Please wait a moment and try again.",
});

module.exports = {
  rateLimit,
  authLimiter,
  paymentLimiter,
  apiLimiter,
  livePollLimiter,
  liveActionLimiter,
};