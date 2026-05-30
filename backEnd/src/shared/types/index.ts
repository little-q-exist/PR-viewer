// ========== Auth ==========
export interface GitHubUser {
  githubId: number;
  login: string;
  avatarUrl: string;
  email?: string;
}

export interface JwtPayload {
  userId: string;
  githubId: number;
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
  date: Date;
}

export interface CommentInfo {
  id: number;
  body: string;
  author: { login: string };
  path?: string;
  line?: number;
  createdAt: Date;
}

export interface PrData {
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
  diff: string;
  commits: CommitInfo[];
  comments: CommentInfo[];
}

export interface ParsedPrUrl {
  owner: string;
  repo: string;
  pullNumber: number;
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

export interface AnalyzerResult {
  summary: Summary;
  fileAnalyses: FileAnalysis[];
  aiUsage: AiUsage;
}
