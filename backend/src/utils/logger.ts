import winston from 'winston';
import path from 'path';

const logDir = path.join(__dirname, '../../logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: { service: 'vr-log-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Development console output
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    })
  );
}

// Request logging helper
export function logRequest(req: { method: string; url: string; ip?: string }, status: number, duration: number) {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    status,
    duration: `${duration}ms`,
    ip: req.ip,
  });
}

// Error logging helper
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
}

export default logger;
