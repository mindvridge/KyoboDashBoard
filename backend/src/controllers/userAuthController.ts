import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user';
import { emailService } from '../services/emailService';
import { config } from '../config';
import { logger } from '../utils/logger';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../utils/errors';
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

  // POST /api/auth/forgot-password
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      const user = await UserModel.findByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        logger.warn('Password reset requested for non-existent email', { email });
        res.json({
          success: true,
          message: '등록된 이메일이라면 비밀번호 재설정 링크가 발송됩니다.',
        });
        return;
      }

      // Create reset token
      const token = await UserModel.createPasswordResetToken(user.id);

      // Send email
      await emailService.sendPasswordResetEmail(email, token, user.username);

      logger.info('Password reset email sent', { email, userId: user.id });

      res.json({
        success: true,
        message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/reset-password
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      // Find valid token
      const resetToken = await UserModel.findPasswordResetToken(token);
      if (!resetToken) {
        throw new BadRequestError('유효하지 않거나 만료된 토큰입니다.');
      }

      // Update password
      await UserModel.updatePassword(resetToken.user_id, password);

      // Mark token as used
      await UserModel.usePasswordResetToken(token);

      logger.info('Password reset successful', { userId: resetToken.user_id });

      res.json({
        success: true,
        message: '비밀번호가 성공적으로 변경되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/auth/find-username
  static async findUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      const user = await UserModel.findByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        logger.warn('Username lookup requested for non-existent email', { email });
        res.json({
          success: true,
          message: '등록된 이메일이라면 아이디 정보가 발송됩니다.',
        });
        return;
      }

      // Send email with username
      await emailService.sendUsernameReminderEmail(email, user.username);

      logger.info('Username reminder email sent', { email, userId: user.id });

      res.json({
        success: true,
        message: '아이디 정보가 이메일로 발송되었습니다.',
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

  // POST /api/auth/verify-token
  static async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      // Find valid token
      const resetToken = await UserModel.findPasswordResetToken(token);
      if (!resetToken) {
        throw new BadRequestError('유효하지 않거나 만료된 토큰입니다.');
      }

      res.json({
        success: true,
        valid: true,
      });
    } catch (error) {
      next(error);
    }
  }
}
