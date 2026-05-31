import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { JwtPayload } from '../../../shared/types';
import { createOAuthUserAuth } from '@octokit/auth-app';
import { User } from '../models/User';

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

/**
 * Get a valid GitHub access token for the given user.
 * Automatically refreshes the token via the stored refresh token if expired.
 * Throws if the user is not found or re-authentication is required.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Quick return if token still has >5 minutes of validity
  const fiveMinutes = 5 * 60 * 1000;
  if (new Date(user.tokenExpiresAt).getTime() - Date.now() > fiveMinutes) {
    return user.accessToken;
  }

  // Token expired or about to expire — refresh required
  if (!user.refreshToken) {
    throw new Error('Refresh token unavailable — re-authentication required');
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET must be configured');
  }

  type RefreshAuthResult = {
    token: string;
    expiresAt?: string;
    refreshToken?: string;
    refreshTokenExpiresAt?: string;
  };

  const auth = createOAuthUserAuth({
    clientType: 'github-app',
    clientId,
    clientSecret,
    token: user.accessToken,
    refreshToken: user.refreshToken,
    expiresAt: user.tokenExpiresAt.toISOString(),
  });

  const result = (await auth({ type: 'refresh' })) as unknown as RefreshAuthResult;

  // Persist refreshed tokens
  user.accessToken = result.token;
  user.tokenExpiresAt = result.expiresAt
    ? new Date(result.expiresAt)
    : new Date(Date.now() + 8 * 60 * 60 * 1000);
  if (result.refreshToken) {
    user.refreshToken = result.refreshToken;
  }
  await user.save();

  return result.token;
}
