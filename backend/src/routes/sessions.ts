import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';
import { authenticateDevice } from '../middleware/auth';
import { validate, sessionStartSchema, sessionEndSchema } from '../middleware/validation';

const router = Router();

// Device authenticated routes
router.post('/start', authenticateDevice, SessionController.start);
router.post('/end', authenticateDevice, validate(sessionEndSchema), SessionController.end);

// Dashboard routes
router.get('/active', SessionController.getActive);
router.get('/stats', SessionController.getStats);
router.get('/:id', SessionController.getById);
router.get('/', SessionController.getByDateRange);

export default router;
