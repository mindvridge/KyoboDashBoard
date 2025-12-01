import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateUser } from '../middleware/userAuth';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
  username: z.string().min(3, '사용자명은 최소 3자 이상이어야 합니다.').max(50),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(100, '비밀번호가 너무 깁니다.'),
  name: z.string().max(255).optional(),
  role: z.enum(['admin', 'user']).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요.').optional(),
  username: z.string().min(3).max(50).optional(),
  name: z.string().max(255).optional(),
  role: z.enum(['admin', 'user']).optional(),
  is_active: z.boolean().optional(),
});

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(100, '비밀번호가 너무 깁니다.'),
});

// All admin routes require authentication
router.use(authenticateUser);

// User management routes
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserById);
router.post('/users', validate(createUserSchema), AdminController.createUser);
router.patch('/users/:id', validate(updateUserSchema), AdminController.updateUser);
router.patch('/users/:id/password', validate(updatePasswordSchema), AdminController.updateUserPassword);
router.delete('/users/:id', AdminController.deleteUser);

export default router;
