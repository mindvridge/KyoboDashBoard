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
  mac_address: z.string().min(1, 'MAC address is required').max(50),
  space_id: z.string().uuid().optional(),
  device_name: z.string().max(255).optional(),
  model: z.string().max(100).optional(),
});

export const sessionStartSchema = z.object({
  device_id: z.string().min(1, 'Device ID is required'),
});

export const contentSelectSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  content_id: z.string().min(1, 'Content ID is required'),
  content_name: z.string().min(1, 'Content name is required'),
  metadata: z.record(z.unknown()).optional(),
});

export const contentWatchSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  content_id: z.string().min(1, 'Content ID is required'),
  content_name: z.string().min(1, 'Content name is required'),
  action_type: z.enum(['WATCH_START', 'WATCH_END', 'WATCH_PAUSE', 'WATCH_RESUME']),
  duration: z.number().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const sessionEndSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
  lobby_time: z.number().min(0).optional(),
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
