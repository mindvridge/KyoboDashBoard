import { pool } from '../config/database';
import { User, UserPublic, PasswordResetToken } from '../types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;

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

  // Password Reset Token Methods
  static async createPasswordResetToken(userId: string): Promise<string> {
    // Invalidate existing tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
      [userId]
    );

    // Generate a random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    logger.info('Password reset token created', { userId });
    return token;
  }

  static async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const result = await pool.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
    return result.rows[0] || null;
  }

  static async usePasswordResetToken(token: string): Promise<void> {
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [token]
    );
  }

  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await this.hashPassword(newPassword);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );
    logger.info('Password updated', { userId });
  }

  // Create new user (for registration if needed)
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
      [data.email, data.username, passwordHash, data.name, data.role || 'user']
    );

    logger.info('New user created', { email: data.email, username: data.username });
    return result.rows[0];
  }
}
