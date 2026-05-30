import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../services/authService';

export async function install(req: Request, res: Response): Promise<void> {
  try {
    const { installationId, code } = req.body;

    if (!installationId || !code) {
      res.status(400).json({ error: 'installationId and code are required' });
      return;
    }

    // TODO: Exchange code for GitHub access token via @octokit/oauth-app
    // For now, create/update user with provided data
    const githubUser = {
      githubId: 0, // will be filled by real GitHub API response
      login: '',   // will be filled by real GitHub API response
      avatarUrl: '',
    };

    const user = await User.findOneAndUpdate(
      { githubId: githubUser.githubId },
      {
        ...githubUser,
        installationId,
        accessToken: 'placeholder-token', // will be real token from GitHub
        tokenExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8h
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
