import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config, validateConfig } from './config';
import { testConnection } from './config/database';
import { connectRedis } from './config/redis';
import { swaggerSpec } from './config/swagger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { RealtimeService } from './services/realtimeService';
import { SchedulerService } from './services/schedulerService';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    // Validate configuration
    validateConfig();

    // Create Express app
    const app = express();
    const server = http.createServer(app);

    // Trust proxy (required for Railway, Heroku, etc.)
    // This allows express-rate-limit to correctly identify users behind proxies
    app.set('trust proxy', 1);

    // CORS
    // Manual CORS handler with security restrictions using config
    const allowedOrigins = config.cors.origins;
    const isDevMode = config.nodeEnv !== 'production';

    app.use((req, res, next) => {
      const origin = req.headers.origin;

      // Determine if origin is allowed
      let isOriginAllowed = false;

      if (isDevMode && allowedOrigins.length === 1 && allowedOrigins[0] === 'http://localhost:3000') {
        // Development mode with default config: allow all origins
        isOriginAllowed = true;
        res.header('Access-Control-Allow-Origin', origin || '*');
        logger.debug('CORS: Development mode - allowing all origins');
      } else if (origin && allowedOrigins.includes(origin)) {
        // Origin is in the allowed list
        isOriginAllowed = true;
        res.header('Access-Control-Allow-Origin', origin);
        logger.debug('CORS: Origin allowed', { origin });
      } else if (origin) {
        // Origin not allowed - log warning
        logger.warn('CORS: Origin blocked', { origin, allowedOrigins });
      }

      // Set other CORS headers only if origin is allowed
      if (isOriginAllowed) {
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.header('Access-Control-Max-Age', '86400'); // 24 hours
      }

      // Handle preflight requests immediately
      if (req.method === 'OPTIONS') {
        return res.status(isOriginAllowed ? 200 : 403).end();
      }

      next();
    });

    // Security middleware (after CORS)
    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    }));

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Cookie parsing
    app.use(cookieParser());

    // Rate limiting
    app.use('/api', apiLimiter);

    // Request logging
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
        });
      });
      next();
    });

    // API Documentation (Swagger UI)
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'VR Log Collection API',
      customCss: '.swagger-ui .topbar { display: none }',
    }));

    // API routes
    app.use('/api', routes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Database connection failed, exiting...');
      process.exit(1);
    }

    // Connect to Redis (optional, continues if fails)
    await connectRedis();

    // Initialize WebSocket
    RealtimeService.initialize(server);

    // Initialize scheduler
    SchedulerService.initialize();

    // Start server
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      SchedulerService.stop();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();
