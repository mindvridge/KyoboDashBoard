import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { RateLimitError } from '../utils/errors';

export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, _next, options) => {
    throw new RateLimitError(options.message as string);
  },
});

// Stricter rate limit for registration
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lenient rate limit for logging endpoints
export const loggingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute (2 per second)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many log requests',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
