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

jest.mock('../models/PullRequest', () => ({
  PullRequest: {
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../services/githubService', () => ({
  parsePrUrl: jest.fn(),
  getOrFetchPr: jest.fn(),
}));

jest.mock('../../auth/services/authService', () => ({
  generateToken: jest.fn(),
  verifyToken: jest.fn(),
  getValidAccessToken: jest.fn(),
}));

import request from 'supertest';
import app from '../../../app';
import { authMiddleware } from '../../../shared/middleware/auth';
import { PullRequest } from '../models/PullRequest';
import { parsePrUrl, getOrFetchPr } from '../services/githubService';
import { getValidAccessToken } from '../../auth/services/authService';

type MockRequest = {
  user?: { userId: string; githubId: number };
};

describe('github controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authMiddleware as jest.Mock).mockImplementation(
      (req: MockRequest, _res: unknown, next: () => void) => {
        req.user = { userId: 'user-1', githubId: 12345 };
        next();
      },
    );
  });

  describe('GET /pull-requests', () => {
    it('should return 200 with the cached PR list', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'pr-1', title: 'Fix login' }]),
      };
      (PullRequest.find as jest.Mock).mockReturnValue(chain);
      (PullRequest.countDocuments as jest.Mock).mockResolvedValue(1);

      const res = await request(app).get('/pull-requests');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
      expect(PullRequest.find).toHaveBeenCalled();
    });
  });

  describe('GET /pull-requests/:id', () => {
    it('should return 200 with the PR detail', async () => {
      const pr = { _id: 'pr-1', title: 'Fix login', files: [] };
      (PullRequest.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(pr),
      });

      const res = await request(app).get('/pull-requests/pr-1');
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Fix login');
    });

    it('should return 404 when the PR does not exist', async () => {
      (PullRequest.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app).get('/pull-requests/missing');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Pull request not found');
    });
  });

  describe('POST /pull-requests/fetch', () => {
    it('should return 200 with fetched PR data', async () => {
      const prData = {
        url: 'https://github.com/o/r/pull/1',
        owner: 'o',
        repo: 'r',
        pullNumber: 1,
        title: 'Fix',
        files: [],
      };
      (parsePrUrl as jest.Mock).mockReturnValue({ owner: 'o', repo: 'r', pullNumber: 1 });
      (getValidAccessToken as jest.Mock).mockResolvedValue('github-token');
      (getOrFetchPr as jest.Mock).mockResolvedValue(prData);

      const res = await request(app)
        .post('/pull-requests/fetch')
        .send({ prUrl: 'https://github.com/o/r/pull/1' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Fix');
      expect(getOrFetchPr).toHaveBeenCalledWith('https://github.com/o/r/pull/1', 'github-token');
    });

    it('should return 400 when prUrl is missing', async () => {
      const res = await request(app).post('/pull-requests/fetch').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('prUrl is required');
    });

    it('should return 400 for an invalid PR URL', async () => {
      (parsePrUrl as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid GitHub PR URL');
      });

      const res = await request(app)
        .post('/pull-requests/fetch')
        .send({ prUrl: 'https://example.com/nope' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid GitHub PR URL');
    });

    it('should return 401 when not authenticated', async () => {
      (authMiddleware as jest.Mock).mockImplementation(
        (_req: MockRequest, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
          res.status(401).json({ error: 'Not authenticated' });
        },
      );

      const res = await request(app)
        .post('/pull-requests/fetch')
        .send({ prUrl: 'https://github.com/o/r/pull/1' });
      expect(res.status).toBe(401);
    });
  });
});
