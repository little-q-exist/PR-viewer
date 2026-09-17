export interface OcrLlm {
  provider: string;
  model: string;
}

export interface OcrRunSummary {
  files_reviewed: number;
  comments: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  elapsed: string;
}

export interface OcrToolCalls {
  total: number;
  by_tool: Record<string, number>;
  failure: number;
  failure_by_tool: Record<string, number>;
  failure_details: unknown[];
}

export interface OcrComment {
  path: string;
  content: string;
  existing_code?: string;
  suggestion_code?: string;
  start_line: number;
  end_line: number;
  category: string;
  severity: string;
  thinking?: string;
}

export interface OcrGroup {
  label: string;
  files: string[];
}

/**
 * OCR CLI v1.11.8 JSON contract. This type is valid only at the parser
 * boundary and must never be persisted or returned by the REST API.
 */
export interface OcrReviewOutput {
  status: string;
  llm?: OcrLlm;
  message?: string;
  summary?: OcrRunSummary;
  tool_calls?: OcrToolCalls;
  comments?: OcrComment[];
  groups?: OcrGroup[];
  session_id?: string;
  manifest?: Record<string, unknown>;
  warnings?: string[];
}
