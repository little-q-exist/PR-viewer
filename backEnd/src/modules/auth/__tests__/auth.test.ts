import jwt from 'jsonwebtoken';

// Mock ESM-only @octokit/auth-app to avoid Jest transform errors
jest.mock('@octokit/auth-app', () => ({
  createOAuthUserAuth: jest.fn(),
}));

import { generateToken, verifyToken } from '../services/authService';

describe('AuthService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '1h' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT with userId and githubId', () => {
      const token = generateToken('65a0b2c3d4e5f6a7b8c9d0e1', 12345);

      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-secret') as { userId: string; githubId: number };
      expect(decoded.userId).toBe('65a0b2c3d4e5f6a7b8c9d0e1');
      expect(decoded.githubId).toBe(12345);
    });

    it('should throw if JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      expect(() => generateToken('user-id', 12345)).toThrow('JWT_SECRET is not configured');
    });
  });

  describe('verifyToken', () => {
    it('should decode a valid token', () => {
      const token = generateToken('user-id', 99999);
      const payload = verifyToken(token)!;
      expect(payload.userId).toBe('user-id');
      expect(payload.githubId).toBe(99999);
    });

    it('should return null for an invalid token', () => {
      const result = verifyToken('invalid-token');
      expect(result).toBeNull();
    });
  });
});
