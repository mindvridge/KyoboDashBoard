import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((e) => {
          const path = e.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(e.message);
        });
        next(new ValidationError('Validation failed', errors));
      } else {
        next(error);
      }
    }
  };
}

// Validation schemas
export const deviceRegistrationSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required').max(255),
  mac_address: z.string().max(50).optional(),
  model: z.string().max(100).optional(),
});

export const sessionStartSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required'),
});

// Custom refinement for metadata size validation
const MAX_METADATA_SIZE = 10240; // 10KB
const metadataValidator = z.record(z.unknown()).optional().refine(
  (data) => {
    if (!data) return true;
    const jsonString = JSON.stringify(data);
    return jsonString.length <= MAX_METADATA_SIZE;
  },
  {
    message: `Metadata size must not exceed ${MAX_METADATA_SIZE} bytes`,
  }
);

export const contentSelectSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  content_id: z.string().min(1, 'Content ID is required').max(255, 'Content ID too long'),
  content_name: z.string().min(1, 'Content name is required').max(500, 'Content name too long'),
  metadata: metadataValidator,
});

export const contentWatchSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  content_id: z.string().min(1, 'Content ID is required').max(255, 'Content ID too long'),
  content_name: z.string().min(1, 'Content name is required').max(500, 'Content name too long'),
  action_type: z.enum(['WATCH_START', 'WATCH_END', 'WATCH_PAUSE', 'WATCH_RESUME']),
  duration: z.number().min(0, 'Duration cannot be negative').max(86400, 'Duration cannot exceed 24 hours').optional(),
  metadata: metadataValidator,
});

export const sessionEndSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  lobby_time: z.number().min(0, 'Lobby time cannot be negative').max(86400, 'Lobby time cannot exceed 24 hours').optional(),
});

export const spaceCreateSchema = z.object({
  name: z.string().min(1, 'Space name is required').max(255),
  location: z.string().min(1, 'Location is required').max(500),
  description: z.string().max(1000).optional(),
});

export const dateRangeSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  space_id: z.string().uuid().optional(),
  device_id: z.string().optional(),
});

// Video validation schemas
export const videoCreateSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(500),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(2000).optional(),
  file_url: z.string().max(1000).optional(),
  thumbnail_url: z.string().max(1000).optional(),
  duration: z.number().min(0).max(86400).optional(),
  file_size: z.number().min(0).optional(),
  is_preinstalled: z.boolean().optional(),
  sort_order: z.number().min(0).optional(),
});

export const videoUpdateSchema = z.object({
  filename: z.string().min(1).max(500).optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  file_url: z.string().max(1000).optional(),
  thumbnail_url: z.string().max(1000).optional(),
  duration: z.number().min(0).max(86400).optional(),
  file_size: z.number().min(0).optional(),
  is_preinstalled: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().min(0).optional(),
});

// User Auth validation schemas
export const userLoginSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

// Password complexity validation
export const passwordSchema = z.string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
  .max(100, '비밀번호는 최대 100자까지 가능합니다.')
  .refine((password) => /[A-Z]/.test(password), {
    message: '비밀번호에 최소 1개의 대문자가 포함되어야 합니다.',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: '비밀번호에 최소 1개의 소문자가 포함되어야 합니다.',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: '비밀번호에 최소 1개의 숫자가 포함되어야 합니다.',
  })
  .refine((password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), {
    message: '비밀번호에 최소 1개의 특수문자가 포함되어야 합니다.',
  });

// Admin user management schemas
export const adminCreateUserSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  username: z.string().min(3, '사용자명은 최소 3자 이상이어야 합니다.').max(50),
  password: passwordSchema,
  name: z.string().max(100).optional(),
  role: z.enum(['admin', 'viewer']).optional(),
});

export const adminUpdateUserSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.').optional(),
  username: z.string().min(3, '사용자명은 최소 3자 이상이어야 합니다.').max(50).optional(),
  name: z.string().max(100).optional(),
  role: z.enum(['admin', 'viewer']).optional(),
  is_active: z.boolean().optional(),
});

export const adminUpdatePasswordSchema = z.object({
  password: passwordSchema,
});
