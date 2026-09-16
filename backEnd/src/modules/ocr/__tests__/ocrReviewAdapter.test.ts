import successFixture from '../__fixtures__/ocr-success.json';
import { adaptOcrReviewOutput, normalizeCategory, normalizeSeverity } from '../services/ocrReviewAdapter';
import { parseOcrReviewOutput } from '../services/ocrReviewParser';

describe('adaptOcrReviewOutput', () => {
  it('maps comments, summary, tool calls, groups, and session metadata', () => {
    const parsed = parseOcrReviewOutput(successFixture);
    const adapted = adaptOcrReviewOutput(parsed.output, parsed.warnings);

    expect(adapted.successful).toBe(true);
    expect(adapted.engineStatus).toBe('complete');
    expect(adapted.llm).toEqual({ provider: 'custom-provider', model: 'model-name' });
    expect(adapted.runSummary).toEqual({
      filesReviewed: 1,
      comments: 2,
      totalTokens: 61434,
      inputTokens: 55430,
      outputTokens: 6004,
      cacheReadTokens: 39424,
      elapsed: '32s',
    });
    expect(adapted.findings[0]).toEqual({
      path: 'src/a.ts',
      content: 'Potential logic bug',
      existingCode: 'if (value)',
      suggestionCode: undefined,
      startLine: 4,
      endLine: 4,
      category: 'logic',
      severity: 'minor',
      rawCategory: 'bug',
      rawSeverity: 'medium',
    });
    expect(JSON.stringify(adapted)).not.toContain('private reasoning');
    expect(adapted.toolCalls?.byTool.code_search).toBe(6);
    expect(adapted.groups).toEqual([{ label: 'source', files: ['src/a.ts', 'src/b.ts'] }]);
    expect(adapted.sessionId).toBe('session-123');
    expect(adapted.aiUsage).toEqual({
      model: 'model-name',
      promptTokens: 55430,
      completionTokens: 6004,
      totalTokens: 61434,
    });
  });

  it('normalizes known OCR enum values', () => {
    expect(normalizeCategory('bug')).toBe('logic');
    expect(normalizeSeverity('high')).toBe('major');
    expect(normalizeSeverity('critical')).toBe('critical');
  });

  it('uses explicit fallbacks while preserving unknown raw enums', () => {
    const adapted = adaptOcrReviewOutput({
      status: 'complete',
      llm: { provider: 'provider', model: 'model' },
      summary: {
        files_reviewed: 1,
        comments: 1,
        total_tokens: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        elapsed: '1s',
      },
      comments: [{
        path: 'src/a.ts',
        content: 'Unknown category',
        start_line: 1,
        end_line: 1,
        category: 'future-category',
        severity: 'future-severity',
      }],
    });

    expect(adapted.findings[0].category).toBe('maintainability');
    expect(adapted.findings[0].severity).toBe('nit');
    expect(adapted.findings[0].rawCategory).toBe('future-category');
    expect(adapted.findings[0].rawSeverity).toBe('future-severity');
  });
});
