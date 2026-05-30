// ===== Common Types =====

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
  author: {
    login: string;
    avatarUrl?: string;
  };
  date: Date;
}

export interface CommentInfo {
  id: number;
  body: string;
  author: {
    login: string;
  };
  path?: string;
  line?: number;
  createdAt: Date;
}

// ===== Review Types =====

export type ReviewStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

export interface SummaryRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'style' | 'logic' | 'maintainability';
  title: string;
  description: string;
}

export interface Summary {
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  overview: string;
  recommendations: SummaryRecommendation[];
}

export interface Suggestion {
  lineStart: number;
  lineEnd: number;
  category: 'security' | 'performance' | 'style' | 'logic' | 'maintainability';
  severity: 'critical' | 'major' | 'minor' | 'nit';
  title: string;
  description: string;
  suggestionCode?: string;
}

export interface FileAnalysis {
  filename: string;
  status: 'added' | 'modified' | 'removed';
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  suggestions: Suggestion[];
}

export interface AiUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}
