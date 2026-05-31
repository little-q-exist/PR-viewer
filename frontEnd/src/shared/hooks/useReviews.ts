import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsAPI, authAPI } from '@/shared/services/api';
import type { ReviewFilters, CreateReviewResponse } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '@/store/modules/authSlice';

// 获取评审列表
export function useReviewList(params?: ReviewFilters) {
  return useQuery({
    queryKey: ['reviews', params],
    queryFn: () => reviewsAPI.list(params).then((res) => res.data),
    staleTime: 30_000,
  });
}

// 获取评审详情（含轮询）
export function useReviewDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsAPI.detail(id!).then((res) => res.data),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      if (data.status === 'completed' || data.status === 'failed') return false;
      return 3000;
    },
  });
}

// 创建评审
export function useCreateReview() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (prUrl: string) => reviewsAPI.create(prUrl).then((res) => res.data),
    onSuccess: (data: CreateReviewResponse) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      navigate(`/review/${data.id}`);
    },
  });
}

// 验证当前用户
export function useAuthUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authAPI.me().then((res) => res.data),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

// GitHub App 安装
export function useInstall() {
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: ({ installationId, code }: { installationId: number; code: string }) =>
      authAPI.install(installationId, code).then((res) => res.data),
    onSuccess: (data) => {
      dispatch(setAuth({ user: data.user, token: data.token }));
    },
  });
}
