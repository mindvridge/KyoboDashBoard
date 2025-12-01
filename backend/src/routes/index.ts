import { Router } from 'express';
import deviceRoutes from './devices';
import sessionRoutes from './sessions';
import logRoutes from './logs';
import statsRoutes from './stats';
import spaceRoutes from './spaces';
import videoRoutes from './videos';
import userAuthRoutes from './userAuth';
import adminRoutes from './admin';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/auth', userAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/devices', deviceRoutes);
router.use('/sessions', sessionRoutes);
router.use('/logs', logRoutes);
router.use('/stats', statsRoutes);
router.use('/spaces', spaceRoutes);
router.use('/videos', videoRoutes);

export default router;
