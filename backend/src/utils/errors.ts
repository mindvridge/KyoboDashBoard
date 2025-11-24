export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message = 'Validation failed', errors: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error', originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', false);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}
