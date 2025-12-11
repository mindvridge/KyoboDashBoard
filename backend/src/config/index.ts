import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Parse DATABASE_URL for Railway
function parseDbUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      name: parsed.pathname.slice(1),
      user: parsed.username,
      password: parsed.password,
    };
  } catch {
    return null;
  }
}

const dbFromUrl = process.env.DATABASE_URL ? parseDbUrl(process.env.DATABASE_URL) : null;

// Safe parseInt with validation
function safeParseInt(value: string | undefined, defaultValue: number, min: number, max: number, name: string): number {
  const parsed = parseInt(value || String(defaultValue), 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${name} must be a number between ${min} and ${max}, got: ${value}`);
    }
    console.warn(`⚠️  WARNING: Invalid ${name} value (${value}), using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

export const config = {
  port: safeParseInt(process.env.PORT, 3001, 1024, 65535, 'PORT'),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: dbFromUrl?.host || process.env.DB_HOST || 'localhost',
    port: dbFromUrl?.port || parseInt(process.env.DB_PORT || '5432', 10),
    name: dbFromUrl?.name || process.env.DB_NAME || 'vr_logs',
    user: dbFromUrl?.user || process.env.DB_USER || 'postgres',
    password: dbFromUrl?.password || process.env.DB_PASSWORD || 'postgres',
    url: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'vr_logs'}`,
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    url: process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      console.warn('⚠️  WARNING: Using default JWT_SECRET for development. Set JWT_SECRET in production!');
      return 'dev-only-insecure-secret-change-in-production';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  rateLimit: {
    windowMs: safeParseInt(process.env.RATE_LIMIT_WINDOW_MS, 900000, 60000, 3600000, 'RATE_LIMIT_WINDOW_MS'),
    maxRequests: safeParseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 100, 1, 10000, 'RATE_LIMIT_MAX_REQUESTS'),
  },

  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  },
};

export function validateConfig(): void {
  // Production 환경에서 필수 환경변수 체크
  if (config.nodeEnv === 'production') {
    const requiredVars = ['JWT_SECRET', 'CORS_ORIGINS'];
    const missing = requiredVars.filter(v => !process.env[v]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
    }

    // JWT Secret 최소 길이 체크 (32자 이상 권장)
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }

    // CORS Origins 검증
    if (process.env.CORS_ORIGINS) {
      const origins = process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(o => o);
      if (origins.length === 0) {
        throw new Error('CORS_ORIGINS is set but empty in production');
      }
      // URL 형식 검증
      origins.forEach(origin => {
        try {
          new URL(origin);
        } catch {
          throw new Error(`Invalid CORS origin: ${origin}. Must be a valid URL (e.g., https://example.com)`);
        }
      });
    }
  }
}
