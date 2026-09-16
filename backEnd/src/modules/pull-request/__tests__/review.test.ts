import { Review } from '../models/Review';
import { PullRequest } from '../../github/models/PullRequest';
import { analyzePullRequest } from '../../analyzer/services/analyzerService';
import { createReview, getReviewById, processReview } from '../services/reviewService';

jest.mock('../models/Review');
jest.mock('../../github/models/PullRequest');
jest.mock('../../analyzer/services/analyzerService');

describe('reviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('creates a pending review using the new domain structure', async () => {
      (Review.create as jest.Mock).mockResolvedValue({
        _id: 'review-123',
        status: 'pending',
      });

      const result = await createReview('user-1', 'pr-1');

      expect(result.status).toBe('pending');
      expect(Review.create).toHaveBeenCalledWith({
        userId: 'user-1',
        prId: 'pr-1',
        engine: 'legacy',
        engineVersion: 'analyzer-v1',
        status: 'pending',
        runSummary: {},
        findings: [],
        groups: [],
        warnings: [],
      });
    });
  });

  describe('getReviewById', () => {
    it('returns a populated review for the owning user', async () => {
      const mockReview = { _id: 'review-123', status: 'completed', findings: [] };
      (Review.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockReview),
          }),
        }),
      });

      const result = await getReviewById('review-123', 'user-1');

      expect(result).toBeDefined();
      expect(Review.findOne).toHaveBeenCalledWith({ _id: 'review-123', userId: 'user-1' });
    });

    it('throws when the review does not belong to the user', async () => {
      (Review.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(getReviewById('nonexistent', 'user-1')).rejects.toThrow('Review not found');
    });
  });

  describe('processReview', () => {
    it('bridges the legacy analyzer into Review and Finding fields', async () => {
      const review = {
        prId: 'pr-1',
        save: jest.fn().mockResolvedValue(undefined),
      };
      (Review.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(review),
      });
      (PullRequest.findById as jest.Mock).mockResolvedValue({
        title: 'Fix login',
        body: '',
        files: [],
        diff: '',
      });
      (analyzePullRequest as jest.Mock).mockResolvedValue({
        summary: {
          riskLevel: 'medium',
          score: 70,
          overview: 'legacy summary',
          recommendations: [],
        },
        fileAnalyses: [
          {
            filename: 'src/a.ts',
            status: 'modified',
            riskLevel: 'medium',
            summary: 'legacy file summary',
            suggestions: [
              {
                lineStart: 4,
                lineEnd: 6,
                category: 'security',
                severity: 'major',
                title: 'legacy title',
                description: 'Use a safe query',
                suggestionCode: 'query()',
              },
            ],
          },
        ],
        aiUsage: {
          model: 'legacy-model',
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15,
        },
      });

      await processReview('review-123', 'token');

      expect(review).toMatchObject({
        engine: 'legacy',
        engineVersion: 'analyzer-v1',
        engineStatus: 'complete',
        status: 'completed',
        llm: { provider: 'legacy', model: 'legacy-model' },
        runSummary: {
          filesReviewed: 1,
          comments: 1,
          totalTokens: 15,
          inputTokens: 10,
          outputTokens: 5,
          cacheReadTokens: 0,
        },
        findings: [
          {
            path: 'src/a.ts',
            content: 'Use a safe query',
            suggestionCode: 'query()',
            startLine: 4,
            endLine: 6,
            category: 'security',
            severity: 'major',
          },
        ],
      });
      expect(review).not.toHaveProperty('summary');
      expect(review).not.toHaveProperty('fileAnalyses');
      expect(review.save).toHaveBeenCalledTimes(2);
    });
  });
});
