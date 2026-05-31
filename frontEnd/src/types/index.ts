// ========== Auth ==========
export interface AuthUser {
  id: string;
  login: string;
  avatarUrl: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ========== GitHub / PullRequest ==========
export interface FileInfo {
  sha: string;
  filename: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: { login: string; avatarUrl: string };
  date: string;
}

export interface CommentInfo {
  id: number;
  body: string;
  author: { login: string };
  path?: string;
  line?: number;
  createdAt: string;
}

export interface PullRequest {
  _id: string;
  url: string;
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: { login: string; avatarUrl: string };
  baseBranch: string;
  headBranch: string;
  files: FileInfo[];
  diff?: string;
  commits?: CommitInfo[];
  comments?: CommentInfo[];
  fetchedAt: string;
  createdAt: string;
}

// ========== Review / AI Analysis ==========
export type ReviewStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Category = 'security' | 'performance' | 'style' | 'logic' | 'maintainability';
export type Severity = 'critical' | 'major' | 'minor' | 'nit';
export type Priority = 'high' | 'medium' | 'low';

export interface Recommendation {
  priority: Priority;
  category: Category;
  title: string;
  description: string;
}

export interface Summary {
  riskLevel: RiskLevel;
  score: number;
  overview: string;
  recommendations: Recommendation[];
}

export interface Suggestion {
  lineStart: number;
  lineEnd?: number;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  suggestionCode?: string;
}

export interface FileAnalysis {
  filename: string;
  status: 'added' | 'modified' | 'removed';
  riskLevel: RiskLevel;
  summary: string;
  suggestions: Suggestion[];
}

export interface AiUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface Review {
  _id: string;
  userId: string | AuthUser;
  prId: string | PullRequest;
  status: ReviewStatus;
  summary?: Summary;
  fileAnalyses?: FileAnalysis[];
  aiUsage?: AiUsage;
  errorMessage?: string | null;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReviewListResponse {
  data: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PRListResponse {
  data: PullRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReviewResponse {
  id: string;
  status: ReviewStatus;
  prUrl: string;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  page?: number;
  limit?: number;
}
