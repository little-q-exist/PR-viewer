import { Router } from 'express';
import { listPullRequests, getPullRequest, fetchAndCachePr } from './controllers/githubController';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

router.get('/', authMiddleware, listPullRequests);
router.get('/:id', authMiddleware, getPullRequest);
router.post('/fetch', authMiddleware, fetchAndCachePr);

export default router;
