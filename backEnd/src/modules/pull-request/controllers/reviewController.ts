import { Request, Response } from 'express';
import { createReview, getReviewById, listReviews, processReview } from '../services/reviewService';
import { parsePrUrl, getOrFetchPr } from '../../github/services/githubService';
import { PullRequest } from '../../github/models/PullRequest';

export async function create(req: Request, res: Response): Promise<void> {
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

    const accessToken = 'placeholder'; // TODO: get from user's stored token
    const prData = await getOrFetchPr(prUrl, accessToken);

    const prDoc = await PullRequest.findOne({
      owner: prData.owner,
      repo: prData.repo,
      pullNumber: prData.pullNumber,
    });

    if (!prDoc) {
      res.status(500).json({ error: 'Failed to cache PR data' });
      return;
    }

    const review = await createReview(req.user.userId, prDoc._id.toString());

    // Start async analysis — don't block the response
    processReview(review._id.toString(), accessToken).catch((err) => {
      console.error('Review processing failed:', err);
    });

    res.status(201).json({
      id: review._id,
      status: review.status,
      prUrl: prData.url,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid GitHub PR URL') {
      res.status(400).json({ error: 'Invalid GitHub PR URL' });
      return;
    }
    res.status(500).json({ error: 'Failed to create review' });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const review = await getReviewById(req.params.id as string);
    res.status(200).json(review);
  } catch (error) {
    if (error instanceof Error && error.message === 'Review not found') {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch review' });
  }
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { status, page, limit } = req.query;
    const result = await listReviews(req.user.userId, {
      status: status as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}
