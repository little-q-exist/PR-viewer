import { Review } from '../models/Review';
import { PullRequest } from '../../github/models/PullRequest';
import { analyzePullRequest } from '../../analyzer/services/analyzerService';
import type { IReview } from '../models/Review';
import type { AnalyzerResult } from '../../../shared/types';

export async function createReview(userId: string, prId: string): Promise<IReview> {
  const review = await Review.create({
    userId,
    prId,
    status: 'pending' as const,
    fileAnalyses: [],
  });
  return review;
}

export async function getReviewById(reviewId: string): Promise<Record<string, unknown>> {
  const review = await Review.findById(reviewId)
    .populate('userId', 'login avatarUrl')
    .populate('prId', 'title url owner repo pullNumber state files diff')
    .lean();

  if (!review) {
    throw new Error('Review not found');
  }

  return review as unknown as Record<string, unknown>;
}

export async function listReviews(
  userId: string,
  options: { status?: string; page?: number; limit?: number } = {},
): Promise<{ data: unknown[]; pagination: Record<string, number> }> {
  const { status, page = 1, limit = 20 } = options;
  const query: Record<string, unknown> = { userId };
  if (status) {
    query.status = status;
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('prId', 'title url owner repo pullNumber state')
      .select('-fileAnalyses')
      .lean(),
    Review.countDocuments(query),
  ]);

  return {
    data: reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function processReview(reviewId: string, accessToken: string): Promise<void> {
  const review = await Review.findById(reviewId).populate('prId');
  if (!review) {
    throw new Error('Review not found');
  }

  try {
    review.status = 'analyzing';
    review.startedAt = new Date();
    await review.save();

    const pr = await PullRequest.findById(review.prId);
    if (!pr) {
      throw new Error('Pull request not found');
    }

    const result: AnalyzerResult = await analyzePullRequest(
      pr.title,
      null,
      pr.files,
      pr.diff,
    );

    review.summary = result.summary;
    review.fileAnalyses = result.fileAnalyses;
    review.aiUsage = result.aiUsage;
    review.status = 'completed';
    review.completedAt = new Date();
    await review.save();
  } catch (error) {
    review.status = 'failed';
    review.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    review.completedAt = new Date();
    await review.save();
  }
}
