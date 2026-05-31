import axios from 'axios';
import type { AuthResponse, CreateReviewResponse, Review, ReviewFilters, ReviewListResponse } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：自动附加 JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 → 清除状态
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 不在此处 dispatch，避免循环依赖；调用方或 ProtectedRoute 处理
    }
    return Promise.reject(error);
  },
);

// ========== Auth API ==========
export const authAPI = {
  install: (installationId: number, code: string) =>
    api.post<AuthResponse>('/auth/install', { installationId, code }),

  me: () => api.get<{ id: string; githubId: number; login: string; avatarUrl: string; email?: string }>('/auth/me'),
};

// ========== Reviews API ==========
export const reviewsAPI = {
  list: (params?: ReviewFilters) =>
    api.get<ReviewListResponse>('/reviews', { params }),

  detail: (id: string) =>
    api.get<Review>(`/reviews/${id}`),

  create: (prUrl: string) =>
    api.post<CreateReviewResponse>('/reviews', { prUrl }),
};

export default api;
