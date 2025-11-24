import { Router } from 'express';
import { DeviceController } from '../controllers/deviceController';
import { authenticateDevice } from '../middleware/auth';
import { validate, deviceRegistrationSchema } from '../middleware/validation';
import { registrationLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post(
  '/register',
  registrationLimiter,
  validate(deviceRegistrationSchema),
  DeviceController.register
);

// Protected routes (dashboard access)
router.get('/', DeviceController.getAll);
router.get('/active', DeviceController.getActive);
router.get('/:id', DeviceController.getById);
router.patch('/:id', DeviceController.update);
router.delete('/:id', DeviceController.delete);

// Device authenticated routes
router.post('/heartbeat', authenticateDevice, DeviceController.heartbeat);

export default router;
