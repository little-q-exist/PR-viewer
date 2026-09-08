// Controller-level tests via the real Express app; all external dependencies
// (octokit, auth, rate limiter, models, services) are mocked.
jest.mock('octokit', () => ({ Octokit: jest.fn() }));
jest.mock('@octokit/auth-app', () => ({ createOAuthUserAuth: jest.fn() }));

jest.mock('../../../shared/middleware/rateLimiter', () => ({
  apiLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  aiLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../../shared/middleware/auth', () => ({
  authMiddleware: jest.fn(),
}));

jest.mock('../../github/models/PullRequest', () => ({
  PullRequest: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../../github/services/githubService', () => ({
  parsePrUrl: jest.fn(),
  getOrFetchPr: jest.fn(),
}));

jest.mock('../../auth/services/authService', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
  getValidAccessToken: jest.fn(),
}));

jest.mock('../services/reviewService', () => ({
  createReview: jest.fn(),
  getReviewById: jest.fn(),
  listReviews: jest.fn(),
  processReview: jest.fn(),
}));

import request from 'supertest';
import app from '../../../app';
import { authMiddleware } from '../../../shared/middleware/auth';
import { PullRequest } from '../../github/models/PullRequest';
import { parsePrUrl, getOrFetchPr } from '../../github/services/githubService';
import { getValidAccessToken } from '../../auth/services/authService';
import { createReview, getReviewById, listReviews, processReview } from '../services/reviewService';

type MockRequest = {
  user?: { userId: string; githubId: number };
};

describe('review controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authMiddleware as jest.Mock).mockImplementation(
      (req: MockRequest, _res: unknown, next: () => void) => {
        req.user = { userId: 'user-1', githubId: 12345 };
        next();
      },
    );
  });

  describe('POST /reviews', () => {
    it('should return 201 and start async analysis', async () => {
      (parsePrUrl as jest.Mock).mockReturnValue({ owner: 'o', repo: 'r', pullNumber: 1 });
      (getValidAccessToken as jest.Mock).mockResolvedValue('github-token');
      (getOrFetchPr as jest.Mock).mockResolvedValue({
        url: 'https://github.com/o/r/pull/1',
        owner: 'o',
        repo: 'r',
        pullNumber: 1,
      });
      (PullRequest.findOne as jest.Mock).mockResolvedValue({ _id: 'pr-1' });
      (createReview as jest.Mock).mockResolvedValue({ _id: 'review-1', status: 'pending' });
      (processReview as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/reviews')
        .send({ prUrl: 'https://github.com/o/r/pull/1' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('review-1');
      expect(createReview).toHaveBeenCalledWith('user-1', 'pr-1');
      expect(processReview).toHaveBeenCalledWith('review-1', 'github-token');
    });

    it('should return 400 when prUrl is missing', async () => {
      const res = await request(app).post('/reviews').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('prUrl is required');
    });

    it('should return 500 when PR caching fails', async () => {
      (parsePrUrl as jest.Mock).mockReturnValue({ owner: 'o', repo: 'r', pullNumber: 1 });
      (getValidAccessToken as jest.Mock).mockResolvedValue('github-token');
      (getOrFetchPr as jest.Mock).mockRejectedValue(new Error('GitHub API down'));

      const res = await request(app)
        .post('/reviews')
        .send({ prUrl: 'https://github.com/o/r/pull/1' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create review');
    });
  });

  describe('GET /reviews', () => {
    it('should return 200 with the review list', async () => {
      (listReviews as jest.Mock).mockResolvedValue({
        data: [{ _id: 'review-1', status: 'completed' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await request(app).get('/reviews');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(listReviews).toHaveBeenCalledWith('user-1', { status: undefined, page: undefined, limit: undefined });
    });

    it('should return 401 when not authenticated', async () => {
      (authMiddleware as jest.Mock).mockImplementation(
        (_req: MockRequest, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
          res.status(401).json({ error: 'Not authenticated' });
        },
      );

      const res = await request(app).get('/reviews');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /reviews/:id', () => {
    it('should return 200 with the review detail', async () => {
      (getReviewById as jest.Mock).mockResolvedValue({
        _id: 'review-1',
        status: 'completed',
        prId: { title: 'Fix', comments: [] },
      });

      const res = await request(app).get('/reviews/review-1');
      expect(res.status).toBe(200);
      expect(res.body.prId.title).toBe('Fix');
      expect(getReviewById).toHaveBeenCalledWith('review-1');
    });

    it('should return 404 when the review does not exist', async () => {
      (getReviewById as jest.Mock).mockRejectedValue(new Error('Review not found'));

      const res = await request(app).get('/reviews/missing');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Review not found');
    });

    it('should return 500 on unexpected errors', async () => {
      (getReviewById as jest.Mock).mockRejectedValue(new Error('DB boom'));

      const res = await request(app).get('/reviews/review-1');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch review');
    });
  });
});
