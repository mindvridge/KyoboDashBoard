import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateUser } from '../middleware/userAuth';
import {
  validate,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminUpdatePasswordSchema,
} from '../middleware/validation';

const router = Router();

// All admin routes require authentication
router.use(authenticateUser);

// User management routes
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserById);
router.post('/users', validate(adminCreateUserSchema), AdminController.createUser);
router.patch('/users/:id', validate(adminUpdateUserSchema), AdminController.updateUser);
router.patch('/users/:id/password', validate(adminUpdatePasswordSchema), AdminController.updateUserPassword);
router.delete('/users/:id', AdminController.deleteUser);

export default router;
