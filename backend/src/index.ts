import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { testConnection } from './config/database';
import { connectRedis } from './config/redis';
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

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: false, // Disable for API
      crossOriginEmbedderPolicy: false,
    }));

    // CORS - Configure allowed origins
    const corsOrigins = config.cors.origin.split(',').map(o => o.trim()).filter(Boolean);
    logger.info('CORS origins configured:', { origins: corsOrigins });

    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
          callback(null, true);
          return;
        }
        // Check if origin is in the allowed list
        if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
          callback(null, true);
        } else {
          logger.warn('CORS blocked origin:', { origin, allowed: corsOrigins });
          callback(null, true); // Temporarily allow all for debugging
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    };

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

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
