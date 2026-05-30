import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { JwtPayload } from '../../../shared/types';

export function generateToken(userId: string, githubId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;

  return jwt.sign({ userId, githubId } as JwtPayload, secret, { expiresIn });
}

export function verifyToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}
