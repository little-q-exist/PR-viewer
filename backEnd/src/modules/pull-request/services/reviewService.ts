import { Review } from '../models/Review';
import { PullRequest } from '../../github/models/PullRequest';
import { analyzePullRequest } from '../../analyzer/services/analyzerService';
import { adaptLegacyAnalyzerResult } from '../../analyzer/services/legacyReviewAdapter';
import type { IReview } from '../models/Review';

const REVIEW_ENGINE = 'legacy' as const;
const REVIEW_ENGINE_VERSION = 'analyzer-v1';

export async function createReview(userId: string, prId: string): Promise<IReview> {
  const review = await Review.create({
    userId,
    prId,
    engine: REVIEW_ENGINE,
    engineVersion: REVIEW_ENGINE_VERSION,
    status: 'pending' as const,
    runSummary: {},
    findings: [],
    groups: [],
    warnings: [],
  });
  return review;
}

export async function getReviewById(
  reviewId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const review = await Review.findOne({ _id: reviewId, userId })
    .populate('userId', 'login avatarUrl')
    .populate('prId', 'title url owner repo pullNumber state author baseBranch headBranch files diff comments')
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
      .select('-findings')
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

    const result = await analyzePullRequest(
      pr.title,
      pr.body ?? null,
      pr.files,
      pr.diff,
    );
    const adapted = adaptLegacyAnalyzerResult(result);

    review.engine = adapted.engine;
    review.engineVersion = adapted.engineVersion;
    review.engineStatus = adapted.engineStatus;
    review.llm = adapted.llm;
    review.message = undefined;
    review.runSummary = adapted.runSummary;
    review.toolCalls = undefined;
    review.findings = adapted.findings;
    review.groups = adapted.groups;
    review.sessionId = undefined;
    review.warnings = adapted.warnings;
    review.aiUsage = adapted.aiUsage;
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
