import { Router } from 'express';
import { SpaceController } from '../controllers/spaceController';
import { validate, spaceCreateSchema } from '../middleware/validation';

const router = Router();

// Space management routes
router.post('/', validate(spaceCreateSchema), SpaceController.create);
router.get('/', SpaceController.getAll);
router.get('/:id', SpaceController.getById);
router.get('/:id/stats', SpaceController.getStats);
router.patch('/:id', SpaceController.update);
router.delete('/:id', SpaceController.delete);

export default router;
