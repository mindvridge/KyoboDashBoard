import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
import { UserJWTPayload } from '../types';
import { logger } from '../utils/logger';

export interface UserAuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    role: string;
  };
}

export function authenticateUser(
  req: UserAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('인증 토큰이 필요합니다.');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as UserJWTPayload;

    // Check if this is a user token (has user_id) vs device token (has device_id)
    if (!decoded.user_id) {
      throw new UnauthorizedError('유효하지 않은 토큰입니다.');
    }

    req.user = {
      user_id: decoded.user_id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid user JWT token', { error: error.message });
      next(new UnauthorizedError('유효하지 않은 토큰입니다.'));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired user JWT token');
      next(new UnauthorizedError('토큰이 만료되었습니다.'));
    } else {
      next(error);
    }
  }
}

// Role-based access control middleware
export function requireRole(...roles: string[]) {
  return (req: UserAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('인증이 필요합니다.'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new UnauthorizedError('접근 권한이 없습니다.'));
      return;
    }

    next();
  };
}
