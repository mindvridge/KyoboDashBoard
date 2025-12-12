import rateLimit from 'express-rate-limit';
import { config } from '../config';

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
  handler: (_req, res, _next, options) => {
    res.status(429).json(options.message);
  },
});

// Rate limit for registration (device_id 기반으로 변경하여 같은 기기의 재시도 허용)
export const registrationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5분
  max: 100, // 5분당 100회 (사실상 제한 없음)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // device_id 기반 Rate Limit (같은 기기는 재시도 허용, IP 공유 문제 해결)
    const deviceId = req.body?.device_id;
    if (deviceId && typeof deviceId === 'string') {
      return `device:${deviceId}`;
    }
    // device_id가 없으면 IP 사용 (fallback)
    return req.ip || 'unknown';
  },
});

// Lenient rate limit for logging endpoints (VR devices send frequent logs)
export const loggingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute (5 per second)
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many log requests, please slow down',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by device token instead of IP (VR devices may share IP)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return req.ip || 'unknown';
  },
});
