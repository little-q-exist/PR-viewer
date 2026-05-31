import { useParams } from 'react-router-dom';
import { useReviewDetail as useReviewDetailQuery } from '@/shared/hooks/useReviews';

export function useReviewDetailData() {
  const { id } = useParams<{ id: string }>();
  const query = useReviewDetailQuery(id);

  return {
    review: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    reviewId: id,
  };
}
