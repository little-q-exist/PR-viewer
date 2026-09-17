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

// ========== Review / Findings ==========
export type ReviewStatus = 'pending' | 'analyzing' | 'completed' | 'failed';
export type ReviewEngine = 'ocr' | 'legacy';
export type Category = 'security' | 'performance' | 'style' | 'logic' | 'maintainability';
export type Severity = 'critical' | 'major' | 'minor' | 'nit';

export interface Finding {
  path: string;
  content: string;
  existingCode?: string;
  suggestionCode?: string;
  startLine: number;
  endLine: number;
  category: Category;
  severity: Severity;
  rawCategory?: string;
  rawSeverity?: string;
}

export interface RunSummary {
  filesReviewed: number;
  comments: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  elapsed: string;
}

export interface ReviewLlm {
  provider: string;
  model: string;
}

export interface ToolCallsSummary {
  total: number;
  byTool: Record<string, number>;
  failure: number;
  failureByTool: Record<string, number>;
  failureDetails: string[];
}

export interface ReviewGroup {
  label: string;
  files: string[];
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
  engine: ReviewEngine;
  engineVersion: string;
  status: ReviewStatus;
  engineStatus?: string;
  llm?: ReviewLlm;
  message?: string;
  runSummary: RunSummary;
  toolCalls?: ToolCallsSummary;
  findings: Finding[];
  groups: ReviewGroup[];
  sessionId?: string;
  warnings: string[];
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
