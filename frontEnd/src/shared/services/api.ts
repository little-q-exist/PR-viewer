import axios from 'axios';
import type { AuthResponse, CreateReviewResponse, Review, ReviewFilters, ReviewListResponse } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  install: (code: string) => api.post<AuthResponse>('/auth/install', { code }),
  me: () => api.get<{ id: string; githubId: number; login: string; avatarUrl: string; email?: string }>('/auth/me'),
};

export const reviewsAPI = {
  list: (params?: ReviewFilters) => api.get<ReviewListResponse>('/reviews', { params }),
  detail: (id: string) => api.get<Review>(`/reviews/${id}`),
  create: (prUrl: string) => api.post<CreateReviewResponse>('/reviews', { prUrl }),
};

export default api;
