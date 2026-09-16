import { useReviewList } from '@/shared/hooks/useReviews';

export function useDashboard() {
  const recentReviews = useReviewList({ page: 1, limit: 5 });
  const allReviews = useReviewList({ page: 1, limit: 1 });

  const totalCount = allReviews.data?.pagination.total ?? 0;

  const recentData = recentReviews.data?.data ?? [];
  const recentCompletedCount = recentData.filter((review) => review.status === 'completed').length;
  const recentFindingCount = recentData.reduce(
    (total, review) => total + review.runSummary.comments,
    0,
  );
  const recentTokenCount = recentData.reduce(
    (total, review) => total + review.runSummary.totalTokens,
    0,
  );

  return {
    totalCount,
    recentCompletedCount,
    recentFindingCount,
    recentTokenCount,
    recentReviews: recentData,
    isLoading: recentReviews.isLoading,
    error: recentReviews.error,
  };
}
