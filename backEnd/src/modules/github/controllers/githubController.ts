import { Request, Response } from 'express';
import { PullRequest } from '../models/PullRequest';
import { getOrFetchPr, parsePrUrl } from '../services/githubService';
import { getValidAccessToken } from '../../auth/services/authService';

export async function listPullRequests(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [prs, total] = await Promise.all([
      PullRequest.find()
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('-diff -commits -comments')
        .lean(),
      PullRequest.countDocuments(),
    ]);

    res.status(200).json({
      data: prs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pull requests' });
  }
}

export async function getPullRequest(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const pr = await PullRequest.findById(id).lean();

    if (!pr) {
      res.status(404).json({ error: 'Pull request not found' });
      return;
    }

    res.status(200).json(pr);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pull request' });
  }
}

export async function fetchAndCachePr(req: Request, res: Response): Promise<void> {
  try {
    const { prUrl } = req.body;

    if (!prUrl) {
      res.status(400).json({ error: 'prUrl is required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    parsePrUrl(prUrl);

    const accessToken = await getValidAccessToken(req.user.userId);
    const prData = await getOrFetchPr(prUrl, accessToken);

    res.status(200).json(prData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid GitHub PR URL') {
      res.status(400).json({ error: 'Invalid GitHub PR URL' });
      return;
    }
    if (error instanceof Error && error.message.includes('re-authentication required')) {
      res.status(401).json({ error: 'GitHub authorization expired. Please re-authenticate.' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch PR data' });
  }
}
