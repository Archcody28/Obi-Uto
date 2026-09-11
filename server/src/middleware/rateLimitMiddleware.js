// Simple in-memory rate limiter
// For production, consider using redis or a dedicated rate-limiting service

const rateLimitStore = new Map();

const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // max requests per window
    message = "Too many requests, please try again later.",
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
  } = options;

  return (req, res, next) => {
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
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
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

module.exports = {
  rateLimit,
  authLimiter,
  paymentLimiter,
  apiLimiter,
};