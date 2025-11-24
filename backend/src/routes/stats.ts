import { Router } from 'express';
import { StatsController } from '../controllers/statsController';

const router = Router();

// Dashboard statistics routes
router.get('/dashboard', StatsController.getDashboard);
router.get('/detailed', StatsController.getDetailed);
router.get('/popular', StatsController.getPopular);
router.get('/daily', StatsController.getDaily);
router.get('/hourly', StatsController.getHourly);

// Export routes
router.get('/export/sessions', StatsController.exportSessions);
router.get('/export/logs', StatsController.exportLogs);

// Alert routes
router.get('/alerts', StatsController.getAlerts);
router.post('/alerts/:id/resolve', StatsController.resolveAlert);

export default router;
