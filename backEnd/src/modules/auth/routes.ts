import { Router } from 'express';
import { install, getMe } from './controllers/authController';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

router.post('/install', install);
router.get('/me', authMiddleware, getMe);

export default router;
