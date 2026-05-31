import { Request, Response } from 'express';
import { createOAuthUserAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';
import { User } from '../models/User';
import { generateToken } from '../services/authService';

export async function install(req: Request, res: Response): Promise<void> {
  try {
    const { installationId, code } = req.body;

    if (!installationId || !code) {
      res.status(400).json({ error: 'installationId and code are required' });
      return;
    }

    const clientId = process.env.GITHUB_APP_CLIENT_ID;
    const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('GITHUB_APP_CLIENT_ID or GITHUB_APP_CLIENT_SECRET not configured');
      res.status(500).json({ error: 'Authentication failed' });
      return;
    }

    // 1. Exchange the OAuth authorization code for a GitHub access token
    const auth = createOAuthUserAuth({
      clientType: 'github-app',
      clientId,
      clientSecret,
      code,
    });

    type OAuthResult = {
      token: string;
      expiresAt?: string;
      refreshToken?: string;
      refreshTokenExpiresAt?: string;
    };
    const authResult = (await auth()) as unknown as OAuthResult;
    const accessToken = authResult.token;

    // 2. Fetch the authenticated user's GitHub profile
    const octokit = new Octokit({ auth: accessToken });
    const { data: ghUser } = await octokit.rest.users.getAuthenticated();

    const githubUser = {
      githubId: ghUser.id,
      login: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      email: ghUser.email ?? undefined,
    };

    // 3. Create or update the user in database
    const user = await User.findOneAndUpdate(
      { githubId: githubUser.githubId },
      {
        ...githubUser,
        installationId,
        accessToken,
        tokenExpiresAt: authResult.expiresAt
          ? new Date(authResult.expiresAt)
          : new Date(Date.now() + 8 * 60 * 60 * 1000),
        refreshToken: authResult.refreshToken,
      },
      { upsert: true, new: true },
    );

    const token = generateToken(user._id.toString(), user.githubId);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        login: user.login,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Auth install error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-accessToken -refreshToken');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({
      id: user._id,
      githubId: user.githubId,
      login: user.login,
      avatarUrl: user.avatarUrl,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
