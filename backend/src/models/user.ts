import { pool } from '../config/database';
import { User, UserPublic } from '../types';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async updateLastLogin(userId: string): Promise<void> {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  static toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
    };
  }

  // Create new user
  static async create(data: {
    email: string;
    username: string;
    password: string;
    name?: string;
    role?: 'admin' | 'user';
  }): Promise<User> {
    const passwordHash = await this.hashPassword(data.password);

    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.email, data.username, passwordHash, data.name, data.role || 'admin']
    );

    logger.info('New user created', { email: data.email, username: data.username });
    return result.rows[0];
  }

  // Get all users
  static async findAll(): Promise<User[]> {
    const result = await pool.query(
      'SELECT * FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Update user
  static async update(id: string, data: {
    email?: string;
    username?: string;
    name?: string;
    role?: 'admin' | 'user';
    is_active?: boolean;
  }): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.username !== undefined) {
      fields.push(`username = $${paramCount++}`);
      values.push(data.username);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.role !== undefined) {
      fields.push(`role = $${paramCount++}`);
      values.push(data.role);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows[0]) {
      logger.info('User updated', { userId: id });
    }
    return result.rows[0] || null;
  }

  // Update password
  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await this.hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );
    logger.info('Password updated', { userId });
  }

  // Delete user (soft delete)
  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rowCount && result.rowCount > 0) {
      logger.info('User deleted', { userId: id });
      return true;
    }
    return false;
  }

  // Hard delete user
  static async hardDelete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rowCount && result.rowCount > 0) {
      logger.info('User permanently deleted', { userId: id });
      return true;
    }
    return false;
  }
}
