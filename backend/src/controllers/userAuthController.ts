import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotFoundError, UnauthorizedError } from '../utils/errors';
import { UserJWTPayload } from '../types';

export class UserAuthController {
  // POST /api/auth/login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(user, password);
      if (!isValidPassword) {
        throw new UnauthorizedError('이메일 또는 비밀번호가 올바르지 않습니다.');
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

      logger.info('User logged in', { email: user.email, userId: user.id });

      res.json({
        success: true,
        data: {
          user: UserModel.toPublic(user),
          token,
        },
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
