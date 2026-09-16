import type {
  AiUsage,
  Category,
  Finding,
  ReviewGroup,
  ReviewLlm,
  RunSummary,
  Severity,
  ToolCallsSummary,
} from '../../../shared/types';
import type { OcrComment, OcrReviewOutput } from '../contracts/ocrReviewOutput';

export interface AdaptedOcrReview {
  successful: boolean;
  engineStatus: string;
  llm?: ReviewLlm;
  message?: string;
  runSummary: RunSummary;
  toolCalls?: ToolCallsSummary;
  findings: Finding[];
  groups: ReviewGroup[];
  sessionId?: string;
  warnings: string[];
  aiUsage?: AiUsage;
}

const categoryMap: Record<string, Category> = {
  security: 'security',
  performance: 'performance',
  style: 'style',
  bug: 'logic',
  maintainability: 'maintainability',
};

const severityMap: Record<string, Severity> = {
  critical: 'critical',
  high: 'major',
  medium: 'minor',
  low: 'nit',
};

export function normalizeCategory(rawCategory: string): Category {
  return categoryMap[rawCategory.toLowerCase()] ?? 'maintainability';
}

export function normalizeSeverity(rawSeverity: string): Severity {
  return severityMap[rawSeverity.toLowerCase()] ?? 'nit';
}

function mapComment(comment: OcrComment): Finding {
  return {
    path: comment.path,
    content: comment.content,
    existingCode: comment.existing_code,
    suggestionCode: comment.suggestion_code,
    startLine: comment.start_line,
    endLine: comment.end_line,
    category: normalizeCategory(comment.category),
    severity: normalizeSeverity(comment.severity),
    rawCategory: comment.category,
    rawSeverity: comment.severity,
  };
}

function emptyRunSummary(): RunSummary {
  return {
    filesReviewed: 0,
    comments: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    elapsed: '',
  };
}

function mapRunSummary(output: OcrReviewOutput): RunSummary {
  if (!output.summary) return emptyRunSummary();
  return {
    filesReviewed: output.summary.files_reviewed,
    comments: output.summary.comments,
    totalTokens: output.summary.total_tokens,
    inputTokens: output.summary.input_tokens,
    outputTokens: output.summary.output_tokens,
    cacheReadTokens: output.summary.cache_read_tokens,
    elapsed: output.summary.elapsed,
  };
}

function stringifyFailureDetail(detail: unknown): string {
  let value: string;
  if (typeof detail === 'string') {
    value = detail;
  } else {
    try {
      value = JSON.stringify(detail) ?? String(detail);
    } catch {
      value = String(detail);
    }
  }
  return value.length > 500 ? `${value.slice(0, 500)}...` : value;
}

export function adaptOcrReviewOutput(
  output: OcrReviewOutput,
  parserWarnings: string[] = [],
): AdaptedOcrReview {
  const runSummary = mapRunSummary(output);
  const llm = output.llm
    ? { provider: output.llm.provider, model: output.llm.model }
    : undefined;

  const adapted: AdaptedOcrReview = {
    successful: output.status === 'complete',
    engineStatus: output.status,
    runSummary,
    findings: (output.comments ?? []).map(mapComment),
    groups: (output.groups ?? []).map((group) => ({
      label: group.label,
      files: [...group.files],
    })),
    warnings: [...(output.warnings ?? []), ...parserWarnings],
  };

  if (llm) adapted.llm = llm;
  if (output.message !== undefined) adapted.message = output.message;
  if (output.session_id !== undefined) adapted.sessionId = output.session_id;

  if (output.tool_calls) {
    adapted.toolCalls = {
      total: output.tool_calls.total,
      byTool: { ...output.tool_calls.by_tool },
      failure: output.tool_calls.failure,
      failureByTool: { ...output.tool_calls.failure_by_tool },
      failureDetails: output.tool_calls.failure_details.map(stringifyFailureDetail),
    };
  }

  if (llm && output.summary) {
    adapted.aiUsage = {
      model: llm.model,
      promptTokens: output.summary.input_tokens,
      completionTokens: output.summary.output_tokens,
      totalTokens: output.summary.total_tokens,
    };
  }

  return adapted;
}
