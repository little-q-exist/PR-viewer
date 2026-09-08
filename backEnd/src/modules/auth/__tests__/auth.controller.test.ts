// Mock ESM-only packages and app-level infrastructure so we can exercise the
// real Express app (routes + controllers) via supertest without a server/DB.
jest.mock('octokit', () => ({ Octokit: jest.fn() }));
jest.mock('@octokit/auth-app', () => ({ createOAuthUserAuth: jest.fn() }));

jest.mock('../../../shared/middleware/rateLimiter', () => ({
  apiLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  aiLimiter: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../../shared/middleware/auth', () => ({
  authMiddleware: jest.fn(),
}));

jest.mock('../models/User', () => ({
  User: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import request from 'supertest';
import app from '../../../app';
import { authMiddleware } from '../../../shared/middleware/auth';
import { User } from '../models/User';

type MockRequest = {
  user?: { userId: string; githubId: number };
};

describe('auth controller', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    (authMiddleware as jest.Mock).mockImplementation(
      (req: MockRequest, _res: unknown, next: () => void) => {
        req.user = { userId: 'user-1', githubId: 12345 };
        next();
      },
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('GET /auth/me', () => {
    it('should return 200 with the current user', async () => {
      const user = {
        _id: 'user-1',
        githubId: 12345,
        login: 'alice',
        avatarUrl: 'https://example.com/a.png',
        email: 'alice@example.com',
      };
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.login).toBe('alice');
      expect(User.findById).toHaveBeenCalledWith('user-1');
    });

    it('should return 401 when not authenticated', async () => {
      (authMiddleware as jest.Mock).mockImplementation(
        (_req: MockRequest, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
          res.status(401).json({ error: 'Not authenticated' });
        },
      );

      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 404 when the user no longer exists', async () => {
      (User.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });
  });

  describe('POST /auth/install', () => {
    it('should return 400 when code is missing', async () => {
      const res = await request(app).post('/auth/install').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('GitHub authorization code');
    });

    it('should return 500 when GitHub App OAuth config is missing', async () => {
      delete process.env.GITHUB_APP_CLIENT_ID;
      delete process.env.GITHUB_APP_CLIENT_SECRET;
      delete process.env.GITHUB_APP_ID;
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app).post('/auth/install').send({ code: 'some-code' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Authentication failed');

      errorSpy.mockRestore();
    });
  });
});

