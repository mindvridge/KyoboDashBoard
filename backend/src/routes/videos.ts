import { Router } from 'express';
import { VideoController } from '../controllers/videoController';
import { validate, videoCreateSchema, videoUpdateSchema } from '../middleware/validation';

const router = Router();

// Public routes (for Unity client)
router.get('/list', VideoController.getList);           // GET /api/videos/list - Active videos for Unity
router.get('/export', VideoController.exportVideos);     // GET /api/videos/export - Export as JSON file
router.get('/index/:index', VideoController.getByIndex); // GET /api/videos/index/:index - Get by index

// Management routes (for dashboard)
router.get('/', VideoController.getAll);                 // GET /api/videos - All videos
router.get('/:id', VideoController.getById);             // GET /api/videos/:id - Get by ID
router.post('/', validate(videoCreateSchema), VideoController.create);  // POST /api/videos - Create
router.patch('/:id', validate(videoUpdateSchema), VideoController.update); // PATCH /api/videos/:id - Update
router.delete('/:id', VideoController.delete);           // DELETE /api/videos/:id - Delete
router.post('/:id/toggle', VideoController.toggleActive); // POST /api/videos/:id/toggle - Toggle active
router.post('/reorder', VideoController.reorder);        // POST /api/videos/reorder - Reorder videos

export default router;
