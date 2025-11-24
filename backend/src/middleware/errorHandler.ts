import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
    stack?: string;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };

    if (err instanceof ValidationError) {
      response.error.errors = err.errors;
    }

    if (config.nodeEnv === 'development') {
      response.error.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  };

  if (config.nodeEnv === 'development') {
    response.error.stack = err.stack;
  }

  res.status(500).json(response);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
