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
    // Parse CORS_ORIGINS as comma-separated list for multiple origins
    origins: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim())
      .filter(o => o),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1분
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10), // 분당 200회
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};

export function validateConfig(): void {
  const isProduction = config.nodeEnv === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // === Required in Production ===

  // JWT_SECRET validation
  if (!process.env.JWT_SECRET) {
    if (isProduction) {
      errors.push('JWT_SECRET is required in production');
    } else {
      warnings.push('JWT_SECRET not set, using default (insecure for production)');
    }
  } else if (process.env.JWT_SECRET.length < 32) {
    if (isProduction) {
      errors.push('JWT_SECRET must be at least 32 characters long for security');
    } else {
      warnings.push('JWT_SECRET should be at least 32 characters for security');
    }
  }

  // Database validation (required if DATABASE_URL not provided)
  if (!process.env.DATABASE_URL) {
    const dbVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingDb = dbVars.filter(v => !process.env[v]);

    if (missingDb.length > 0 && isProduction) {
      errors.push(`Database configuration incomplete. Missing: ${missingDb.join(', ')} (or provide DATABASE_URL)`);
    }
  }

  // CORS validation
  if (isProduction) {
    const corsOrigins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
    if (!corsOrigins) {
      warnings.push('CORS_ORIGINS not set in production. All origins will be blocked.');
    } else if (corsOrigins.includes('localhost') || corsOrigins.includes('127.0.0.1')) {
      warnings.push('CORS_ORIGINS contains localhost in production environment');
    }
  }

  // === Log warnings ===
  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration Warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
    console.warn('');
  }

  // === Throw on errors ===
  if (errors.length > 0) {
    const errorMessage = [
      '\n❌ Configuration Errors:',
      ...errors.map(e => `   - ${e}`),
      '\nPlease set the required environment variables and restart the server.',
      ''
    ].join('\n');

    throw new Error(errorMessage);
  }
}
