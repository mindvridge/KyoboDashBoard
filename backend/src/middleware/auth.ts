import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';
import { JWTPayload } from '../types';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  device?: {
    device_id: string;
    space_id: string;
  };
}

export function authenticateDevice(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    req.device = {
      device_id: decoded.device_id,
      space_id: decoded.space_id,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token');
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

export function generateToken(deviceId: string, spaceId: string): string {
  return jwt.sign(
    { device_id: deviceId, space_id: spaceId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, config.jwt.secret) as JWTPayload;
}

// Optional authentication - doesn't fail if no token
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    req.device = {
      device_id: decoded.device_id,
      space_id: decoded.space_id,
    };
  } catch {
    // Ignore token errors for optional auth
  }

  next();
}
