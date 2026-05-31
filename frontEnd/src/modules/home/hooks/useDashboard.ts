import { useReviewList } from '@/shared/hooks/useReviews';

export function useDashboard() {
  const recentReviews = useReviewList({ page: 1, limit: 5 });
  const allReviews = useReviewList({ page: 1, limit: 1 });

  const totalCount = allReviews.data?.pagination.total ?? 0;

  // Calculate risk distribution from recent reviews
  const recentData = recentReviews.data?.data ?? [];
  const highRiskCount = recentData.filter((r) => r.summary?.riskLevel === 'high').length;
  const mediumRiskCount = recentData.filter((r) => r.summary?.riskLevel === 'medium').length;
  const lowRiskCount = recentData.filter((r) => r.summary?.riskLevel === 'low').length;

  return {
    totalCount,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    recentReviews: recentData,
    isLoading: recentReviews.isLoading,
    error: recentReviews.error,
  };
}
