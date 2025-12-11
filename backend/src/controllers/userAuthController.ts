import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotFoundError, UnauthorizedError, AppError } from '../utils/errors';
import { UserJWTPayload } from '../types';

export class UserAuthController {
  // POST /api/auth/login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      logger.info('Login attempt', { email });

      // Find user by email
      let user;
      try {
        user = await UserModel.findByEmail(email);
      } catch (dbError: any) {
        logger.error('Database error during login', {
          email,
          error: dbError.message,
          stack: dbError.stack
        });
        throw new AppError(
          '데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          503,
          'DATABASE_ERROR'
        );
      }

      if (!user) {
        logger.warn('Login failed: user not found', { email });
        throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(user, password);
      if (!isValidPassword) {
        logger.warn('Login failed: invalid password', { email });
        throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      // Check if user is active
      if (!user.is_active) {
        logger.warn('Login failed: user is inactive', { email, userId: user.id });
        throw new UnauthorizedError('비활성화된 계정입니다. 관리자에게 문의해주세요.');
      }

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate token
      const token = jwt.sign(
        {
          user_id: user.id,
          email: user.email,
          role: user.role,
        } as Omit<UserJWTPayload, 'iat' | 'exp'>,
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      logger.info('User logged in successfully', { email: user.email, userId: user.id });

      // Set HttpOnly Cookie for security (prevents XSS attacks)
      // Note: sameSite 'none' is required for cross-domain cookies (frontend and backend on different domains)
      const isProduction = config.nodeEnv === 'production';
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction, // HTTPS only in production (required when sameSite is 'none')
        sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-domain, 'lax' for local dev
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      res.json({
        success: true,
        data: {
          user: UserModel.toPublic(user),
        },
      });
    } catch (error: any) {
      logger.error('Login error', {
        email: req.body?.email,
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      next(error);
    }
  }

  // POST /api/auth/logout
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isProduction = config.nodeEnv === 'production';

      // Clear the auth cookie
      res.cookie('auth_token', '', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 0,
        path: '/',
      });

      logger.info('User logged out successfully');

      res.json({
        success: true,
        message: '로그아웃되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as any;
      if (!authReq.user?.user_id) {
        throw new UnauthorizedError('인증이 필요합니다.');
      }

      const user = await UserModel.findById(authReq.user.user_id);
      if (!user) {
        throw new NotFoundError('사용자를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        data: UserModel.toPublic(user),
      });
    } catch (error) {
      next(error);
    }
  }
}
