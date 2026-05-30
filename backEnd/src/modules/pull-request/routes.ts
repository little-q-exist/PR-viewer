import { Router } from 'express';
import { create, getById, list } from './controllers/reviewController';
import { authMiddleware } from '../../shared/middleware/auth';
import { aiLimiter } from '../../shared/middleware/rateLimiter';

const router = Router();

router.post('/', authMiddleware, aiLimiter, create);
router.get('/', authMiddleware, list);
router.get('/:id', authMiddleware, getById);

export default router;
