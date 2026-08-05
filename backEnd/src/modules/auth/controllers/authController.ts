import { Request, Response } from 'express';
import { createOAuthUserAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';
import { User } from '../models/User';
import { generateToken } from '../services/authService';

type OAuthResult = {
  token: string;
  expiresAt?: string;
  refreshToken?: string;
};

function getConfiguredAppId(): number | null {
  const appId = Number(process.env.GITHUB_APP_ID);
  return Number.isSafeInteger(appId) && appId > 0 ? appId : null;
}

export async function install(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.body;

    if (typeof code !== 'string' || !code) {
      res.status(400).json({ error: 'GitHub authorization code is required' });
      return;
    }

    const clientId = process.env.GITHUB_APP_CLIENT_ID;
    const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
    const appId = getConfiguredAppId();

    if (!clientId || !clientSecret || !appId) {
      console.error('GitHub App OAuth configuration is incomplete');
      res.status(500).json({ error: 'Authentication failed' });
      return;
    }

    // Exchange the OAuth authorization code for a GitHub user access token.
    const auth = createOAuthUserAuth({
      clientType: 'github-app',
      clientId,
      clientSecret,
      code,
    });
    const authResult = (await auth()) as unknown as OAuthResult;
    const accessToken = authResult.token;
    const octokit = new Octokit({ auth: accessToken });

    // The OAuth callback does not contain an installation ID for users who have
    // already installed the app. Query GitHub instead and only accept an
    // installation belonging to this app.
    const [{ data: ghUser }, { data: installations }] = await Promise.all([
      octokit.rest.users.getAuthenticated(),
      octokit.rest.apps.listInstallationsForAuthenticatedUser({ per_page: 100 }),
    ]);
    const installation = installations.installations.find(
      (candidate) => candidate.app_id === appId,
    );

    if (!installation) {
      res.status(409).json({
        error: 'GitHub App is not installed for this account. Install the app, then sign in again.',
      });
      return;
    }

    const githubUser = {
      githubId: ghUser.id,
      login: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      email: ghUser.email ?? undefined,
    };

    const user = await User.findOneAndUpdate(
      { githubId: githubUser.githubId },
      {
        ...githubUser,
        installationId: installation.id,
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
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: unknown }).status
        : undefined;

    if (status === 400) {
      res.status(400).json({ error: 'GitHub authorization code is invalid or expired. Please try again.' });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown authentication error';
    console.error('Auth login error:', { status, message });
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
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
