import express from 'express';
import http from 'http';
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

    // CORS - MUST be first, before any other middleware
    // Manual CORS handler to ensure headers are always set
    app.use((req, res, next) => {
      const origin = req.headers.origin;

      // Allow all origins for now (can be restricted later)
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours

      // Handle preflight requests immediately
      if (req.method === 'OPTIONS') {
        logger.info('CORS preflight request', { origin, path: req.path });
        return res.status(200).end();
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
