import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user';
import { logger } from '../utils/logger';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class AdminController {
  // GET /api/admin/users - Get all users
  static async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await UserModel.findAll();
      const publicUsers = users.map(user => UserModel.toPublic(user));

      res.json({
        success: true,
        data: publicUsers,
        count: publicUsers.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/users/:id - Get user by ID
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);

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

  // POST /api/admin/users - Create new user
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password, name, role } = req.body;

      // Check if email already exists
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) {
        throw new ConflictError('이미 사용 중인 이메일입니다.');
      }

      // Check if username already exists
      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        throw new ConflictError('이미 사용 중인 사용자명입니다.');
      }

      const user = await UserModel.create({
        email,
        username,
        password,
        name,
        role: role || 'admin',
      });

      logger.info('Admin created new user', { email, username });

      res.status(201).json({
        success: true,
        data: UserModel.toPublic(user),
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/users/:id - Update user
  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { email, username, name, role, is_active } = req.body;

      const existingUser = await UserModel.findById(id);
      if (!existingUser) {
        throw new NotFoundError('사용자를 찾을 수 없습니다.');
      }

      // Check email uniqueness if changing
      if (email && email !== existingUser.email) {
        const emailExists = await UserModel.findByEmail(email);
        if (emailExists) {
          throw new ConflictError('이미 사용 중인 이메일입니다.');
        }
      }

      // Check username uniqueness if changing
      if (username && username !== existingUser.username) {
        const usernameExists = await UserModel.findByUsername(username);
        if (usernameExists) {
          throw new ConflictError('이미 사용 중인 사용자명입니다.');
        }
      }

      const updatedUser = await UserModel.update(id, {
        email,
        username,
        name,
        role,
        is_active,
      });

      res.json({
        success: true,
        data: UserModel.toPublic(updatedUser!),
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/users/:id/password - Update user password
  static async updateUserPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { password } = req.body;

      const user = await UserModel.findById(id);
      if (!user) {
        throw new NotFoundError('사용자를 찾을 수 없습니다.');
      }

      await UserModel.updatePassword(id, password);

      res.json({
        success: true,
        message: '비밀번호가 변경되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/admin/users/:id - Delete user
  static async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const authReq = req as any;
      const currentUserId = authReq.user?.user_id;

      // Prevent self-deletion
      if (id === currentUserId) {
        throw new ForbiddenError('자신의 계정은 삭제할 수 없습니다.');
      }

      const user = await UserModel.findById(id);
      if (!user) {
        throw new NotFoundError('사용자를 찾을 수 없습니다.');
      }

      const deleted = await UserModel.delete(id);

      if (!deleted) {
        throw new NotFoundError('사용자를 찾을 수 없습니다.');
      }

      res.json({
        success: true,
        message: '사용자가 삭제되었습니다.',
      });
    } catch (error) {
      next(error);
    }
  }
}
