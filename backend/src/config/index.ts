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

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
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
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};

export function validateConfig(): void {
  const requiredVars = ['JWT_SECRET'];
  const missing = requiredVars.filter(v => !process.env[v] && config.nodeEnv === 'production');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
