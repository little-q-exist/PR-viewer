import { Review } from '../models/Review';
import { createReview, getReviewById, listReviews } from '../services/reviewService';

jest.mock('../models/Review');
jest.mock('../../github/services/githubService');
jest.mock('../../analyzer/services/analyzerService');

describe('reviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('should create a review with pending status', async () => {
      const mockReview = {
        _id: 'review-123',
        userId: 'user-1',
        prId: 'pr-1',
        status: 'pending',
        fileAnalyses: [],
      };

      (Review.create as jest.Mock).mockResolvedValue(mockReview);

      const result = await createReview('user-1', 'pr-1');
      expect(result.status).toBe('pending');
      expect(Review.create).toHaveBeenCalledWith({
        userId: 'user-1',
        prId: 'pr-1',
        status: 'pending',
        fileAnalyses: [],
      });
    });
  });

  describe('getReviewById', () => {
    it('should return review with populated fields', async () => {
      const mockReview = {
        _id: 'review-123',
        status: 'completed',
        summary: { riskLevel: 'low', score: 90 },
      };

      (Review.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockReview),
          }),
        }),
      });

      const result = await getReviewById('review-123');
      expect(result).toBeDefined();
    });

    it('should throw for non-existent review', async () => {
      (Review.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(getReviewById('nonexistent')).rejects.toThrow('Review not found');
    });
  });
});
