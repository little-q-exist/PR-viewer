import type {
  OcrComment,
  OcrGroup,
  OcrLlm,
  OcrReviewOutput,
  OcrRunSummary,
  OcrToolCalls,
} from '../contracts/ocrReviewOutput';

export type OcrContractErrorCode =
  | 'INVALID_JSON'
  | 'INVALID_OUTPUT'
  | 'INCOMPLETE_OUTPUT';

export class OcrContractError extends Error {
  constructor(
    public readonly code: OcrContractErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OcrContractError';
  }
}

export interface OcrParseResult {
  output: OcrReviewOutput;
  warnings: string[];
  skippedComments: number;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isFiniteNumber(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && isFiniteNumber(value) && value >= 1;
}

function parseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    throw new OcrContractError('INVALID_JSON', 'OCR output is not valid JSON');
  }
}

function parseLlm(value: unknown): OcrLlm | null {
  if (!isObject(value)) return null;
  const provider = value.provider;
  const model = value.model;
  if (typeof provider !== 'string' || !provider || typeof model !== 'string' || !model) {
    return null;
  }
  return { provider, model };
}

function parseRunSummary(value: unknown): OcrRunSummary | null {
  if (!isObject(value)) return null;
  const filesReviewed = value.files_reviewed;
  const comments = value.comments;
  const totalTokens = value.total_tokens;
  const inputTokens = value.input_tokens;
  const outputTokens = value.output_tokens;
  const cacheReadTokens = value.cache_read_tokens;
  const elapsed = value.elapsed;

  if (
    !isNonNegativeInteger(filesReviewed) ||
    !isNonNegativeInteger(comments) ||
    !isNonNegativeInteger(totalTokens) ||
    !isNonNegativeInteger(inputTokens) ||
    !isNonNegativeInteger(outputTokens) ||
    !isNonNegativeInteger(cacheReadTokens) ||
    typeof elapsed !== 'string'
  ) {
    return null;
  }

  return {
    files_reviewed: filesReviewed,
    comments,
    total_tokens: totalTokens,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: cacheReadTokens,
    elapsed,
  };
}

function parseComment(value: unknown): OcrComment | null {
  if (!isObject(value)) return null;

  const path = value.path;
  const content = value.content;
  const startLine = value.start_line;
  const endLine = value.end_line;
  const category = value.category;
  const severity = value.severity;

  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    typeof content !== 'string' ||
    content.length === 0 ||
    !isPositiveInteger(startLine) ||
    !isPositiveInteger(endLine) ||
    endLine < startLine ||
    typeof category !== 'string' ||
    category.length === 0 ||
    typeof severity !== 'string' ||
    severity.length === 0
  ) {
    return null;
  }

  const comment: OcrComment = {
    path,
    content,
    start_line: startLine,
    end_line: endLine,
    category,
    severity,
  };

  if (typeof value.existing_code === 'string') {
    comment.existing_code = value.existing_code;
  }
  if (typeof value.suggestion_code === 'string') {
    comment.suggestion_code = value.suggestion_code;
  }
  if (typeof value.thinking === 'string') {
    comment.thinking = value.thinking;
  }

  return comment;
}

function parseCountMap(value: unknown): Record<string, number> | null {
  if (!isObject(value)) return null;
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (isNonNegativeInteger(count)) {
      result[key] = count;
    }
  }
  return result;
}

function parseToolCalls(value: unknown): OcrToolCalls | null {
  if (!isObject(value)) return null;
  const total = value.total;
  const failure = value.failure;
  const byTool = parseCountMap(value.by_tool);
  const failureByTool = parseCountMap(value.failure_by_tool);
  const failureDetails = value.failure_details;

  if (
    !isNonNegativeInteger(total) ||
    !isNonNegativeInteger(failure) ||
    byTool === null ||
    failureByTool === null ||
    !Array.isArray(failureDetails)
  ) {
    return null;
  }

  return {
    total,
    by_tool: byTool,
    failure,
    failure_by_tool: failureByTool,
    failure_details: failureDetails,
  };
}

function parseGroups(value: unknown): OcrGroup[] | null {
  if (!Array.isArray(value)) return null;
  const groups: OcrGroup[] = [];
  for (const item of value) {
    if (!isObject(item) || typeof item.label !== 'string' || !Array.isArray(item.files)) {
      return null;
    }
    const files = item.files.filter((file): file is string => typeof file === 'string');
    if (files.length !== item.files.length) {
      return null;
    }
    groups.push({ label: item.label, files });
  }
  return groups;
}

function parseWarnings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((warning) => typeof warning === 'string')) return null;
  return value;
}

function optionalString(
  value: unknown,
  key: string,
  warnings: string[],
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  warnings.push(`OCR field "${key}" was ignored because it is not a string`);
  return undefined;
}

export function parseOcrReviewOutput(input: string | unknown): OcrParseResult {
  const raw = typeof input === 'string' ? parseJson(input) : input;
  if (!isObject(raw)) {
    throw new OcrContractError('INVALID_OUTPUT', 'OCR output must be a JSON object');
  }
  if (typeof raw.status !== 'string' || raw.status.trim().length === 0) {
    throw new OcrContractError('INVALID_OUTPUT', 'OCR output is missing a valid status');
  }

  const status = raw.status.trim();
  const isComplete = status === 'complete';
  const warnings: string[] = [];
  const output: OcrReviewOutput = { status };

  const llm = raw.llm === undefined ? null : parseLlm(raw.llm);
  if (llm) {
    output.llm = llm;
  } else if (isComplete) {
    throw new OcrContractError(
      'INCOMPLETE_OUTPUT',
      'Complete OCR output is missing valid llm metadata',
    );
  } else if (raw.llm !== undefined) {
    warnings.push('OCR llm metadata was ignored because it is invalid for a failed run');
  }

  const summary = raw.summary === undefined ? null : parseRunSummary(raw.summary);
  if (summary) {
    output.summary = summary;
  } else if (isComplete) {
    throw new OcrContractError(
      'INCOMPLETE_OUTPUT',
      'Complete OCR output is missing a valid summary',
    );
  } else if (raw.summary !== undefined) {
    warnings.push('OCR summary was ignored because it is invalid for a failed run');
  }

  let skippedComments = 0;
  const comments: OcrComment[] = [];
  if (raw.comments !== undefined) {
    if (!Array.isArray(raw.comments)) {
      if (isComplete) {
        throw new OcrContractError(
          'INCOMPLETE_OUTPUT',
          'Complete OCR output has an invalid comments list',
        );
      }
      warnings.push('OCR comments were ignored because the list is invalid');
    } else {
      raw.comments.forEach((comment, index) => {
        const parsed = parseComment(comment);
        if (parsed) {
          comments.push(parsed);
        } else {
          skippedComments += 1;
          warnings.push(`OCR comment at index ${index} was skipped because it is malformed`);
        }
      });
    }
  } else if (isComplete) {
    throw new OcrContractError(
      'INCOMPLETE_OUTPUT',
      'Complete OCR output is missing the comments list',
    );
  }
  output.comments = comments;

  const message = optionalString(raw.message, 'message', warnings);
  if (message !== undefined) output.message = message;

  const sessionId = optionalString(raw.session_id, 'session_id', warnings);
  if (sessionId !== undefined) output.session_id = sessionId;

  if (raw.tool_calls !== undefined) {
    const toolCalls = parseToolCalls(raw.tool_calls);
    if (toolCalls) {
      output.tool_calls = toolCalls;
    } else {
      warnings.push('OCR tool_calls were ignored because the summary is invalid');
    }
  }

  if (raw.groups !== undefined) {
    const groups = parseGroups(raw.groups);
    if (groups) {
      output.groups = groups;
    } else {
      warnings.push('OCR groups were ignored because the list is invalid');
    }
  }

  if (raw.warnings !== undefined) {
    const parsedWarnings = parseWarnings(raw.warnings);
    if (parsedWarnings) {
      output.warnings = parsedWarnings;
    } else {
      warnings.push('OCR warnings were ignored because the list is invalid');
    }
  }

  if (raw.manifest !== undefined) {
    if (isObject(raw.manifest)) {
      output.manifest = raw.manifest;
    } else {
      warnings.push('OCR manifest was ignored because it is not an object');
    }
  }

  return { output, warnings, skippedComments };
}
