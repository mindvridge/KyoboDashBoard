import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { config } from './index';
import { logger } from '../utils/logger';

export function initSentry(): void {
  if (!config.sentry.enabled || !config.sentry.dsn) {
    logger.info('Sentry is disabled or DSN not provided');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    integrations: [
      // Profiling integration for performance monitoring
      new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev
    // Profiling
    profilesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Network errors
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      // Client-side errors (should be handled by client)
      'ValidationError',
      'NotFoundError',
    ],
  });

  logger.info('Sentry initialized', {
    environment: config.sentry.environment,
    dsn: config.sentry.dsn.substring(0, 30) + '...',
  });
}

export { Sentry };
