import { useState } from 'react';
import { useReviewList } from '@/shared/hooks/useReviews';
import type { ReviewStatus } from '@/types';

export function usePRList() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useReviewList({
    status: statusFilter,
    page,
    limit: 20,
  });

  return {
    reviews: data?.data ?? [],
    pagination: data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    statusFilter,
    setStatusFilter: (status: ReviewStatus | undefined) => {
      setStatusFilter(status);
      setPage(1);
    },
    page,
    setPage,
    isLoading,
    error,
  };
}
