import { Router } from 'express';
import { UserAuthController } from '../controllers/userAuthController';
import { authenticateUser } from '../middleware/userAuth';
import {
  validate,
  userLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  findUsernameSchema,
  verifyTokenSchema,
} from '../middleware/validation';

const router = Router();

// Public routes
router.post('/login', validate(userLoginSchema), UserAuthController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), UserAuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), UserAuthController.resetPassword);
router.post('/find-username', validate(findUsernameSchema), UserAuthController.findUsername);
router.post('/verify-token', validate(verifyTokenSchema), UserAuthController.verifyToken);

// Protected routes
router.get('/me', authenticateUser, UserAuthController.getCurrentUser);

export default router;
