import { Router } from 'express';
import { UserAuthController } from '../controllers/userAuthController';
import { authenticateUser } from '../middleware/userAuth';
import { validate, userLoginSchema } from '../middleware/validation';

const router = Router();

// Public routes
router.post('/login', validate(userLoginSchema), UserAuthController.login);
router.post('/logout', UserAuthController.logout);

// Protected routes
router.get('/me', authenticateUser, UserAuthController.getCurrentUser);

export default router;
