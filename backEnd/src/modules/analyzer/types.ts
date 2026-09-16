import type { Category, Severity } from '../../shared/types';

export type RiskLevel = 'low' | 'medium' | 'high';
export type Priority = 'high' | 'medium' | 'low';

export interface LegacyRecommendation {
  priority: Priority;
  category: Category;
  title: string;
  description: string;
}

export interface LegacySummary {
  riskLevel: RiskLevel;
  score: number;
  overview: string;
  recommendations: LegacyRecommendation[];
}

export interface LegacySuggestion {
  lineStart: number;
  lineEnd?: number;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  suggestionCode?: string;
}

export interface LegacyFileAnalysis {
  filename: string;
  status: 'added' | 'modified' | 'removed';
  riskLevel: RiskLevel;
  summary: string;
  suggestions: LegacySuggestion[];
}

export interface LegacyAiUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface LegacyAnalyzerResult {
  summary: LegacySummary;
  fileAnalyses: LegacyFileAnalysis[];
  aiUsage: LegacyAiUsage;
}
