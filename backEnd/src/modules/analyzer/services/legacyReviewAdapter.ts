import type { Finding, ReviewLlm, RunSummary } from '../../../shared/types';
import type { LegacyAnalyzerResult } from '../types';

export interface AdaptedLegacyReview {
  engine: 'legacy';
  engineVersion: string;
  engineStatus: string;
  llm: ReviewLlm;
  runSummary: RunSummary;
  findings: Finding[];
  groups: [];
  warnings: string[];
  aiUsage: LegacyAnalyzerResult['aiUsage'];
}

export function adaptLegacyAnalyzerResult(result: LegacyAnalyzerResult): AdaptedLegacyReview {
  const findings = result.fileAnalyses.flatMap((file) =>
    file.suggestions.map((suggestion): Finding => ({
      path: file.filename,
      content: suggestion.description,
      suggestionCode: suggestion.suggestionCode,
      startLine: suggestion.lineStart,
      endLine: suggestion.lineEnd ?? suggestion.lineStart,
      category: suggestion.category,
      severity: suggestion.severity,
    })),
  );

  return {
    engine: 'legacy',
    engineVersion: 'analyzer-v1',
    engineStatus: 'complete',
    llm: {
      provider: 'legacy',
      model: result.aiUsage.model,
    },
    runSummary: {
      filesReviewed: result.fileAnalyses.length,
      comments: findings.length,
      totalTokens: result.aiUsage.totalTokens,
      inputTokens: result.aiUsage.promptTokens,
      outputTokens: result.aiUsage.completionTokens,
      cacheReadTokens: 0,
      elapsed: '',
    },
    findings,
    groups: [],
    warnings: [],
    aiUsage: result.aiUsage,
  };
}
