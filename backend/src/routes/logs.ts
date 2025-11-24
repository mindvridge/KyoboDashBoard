import { Router } from 'express';
import { LogController } from '../controllers/logController';
import { authenticateDevice } from '../middleware/auth';
import { validate, contentSelectSchema, contentWatchSchema } from '../middleware/validation';
import { loggingLimiter } from '../middleware/rateLimiter';

const router = Router();

// Device authenticated routes with rate limiting
router.post(
  '/content-select',
  authenticateDevice,
  loggingLimiter,
  validate(contentSelectSchema),
  LogController.contentSelect
);

router.post(
  '/content-watch',
  authenticateDevice,
  loggingLimiter,
  validate(contentWatchSchema),
  LogController.contentWatch
);

router.post(
  '/lobby',
  authenticateDevice,
  loggingLimiter,
  LogController.lobby
);

router.post(
  '/content-switch',
  authenticateDevice,
  loggingLimiter,
  LogController.contentSwitch
);

// Dashboard routes
router.get('/recent', LogController.getRecent);
router.get('/session/:sessionId', LogController.getBySession);
router.get('/content/:contentId/stats', LogController.getContentStats);
router.get('/', LogController.getByDateRange);

export default router;
