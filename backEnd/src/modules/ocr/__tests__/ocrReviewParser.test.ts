import successFixture from '../__fixtures__/ocr-success.json';
import { OcrContractError, parseOcrReviewOutput } from '../services/ocrReviewParser';

describe('parseOcrReviewOutput', () => {
  it('parses the v1.11.8 success contract without warnings', () => {
    const result = parseOcrReviewOutput(JSON.stringify(successFixture));

    expect(result.output.status).toBe('complete');
    expect(result.output.comments).toHaveLength(2);
    expect(result.output.session_id).toBe('session-123');
    expect(result.output.tool_calls?.failure_details).toEqual([
      { tool: 'code_search', error: 'not found' },
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.skippedComments).toBe(0);
    expect(result.output.comments?.[0].thinking).toContain('private reasoning');
  });

  it('accepts optional fields being omitted', () => {
    const result = parseOcrReviewOutput({
      status: 'complete',
      llm: { provider: 'provider', model: 'model' },
      summary: {
        files_reviewed: 0,
        comments: 0,
        total_tokens: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        elapsed: '1s',
      },
      comments: [],
    });

    expect(result.output.warnings).toBeUndefined();
    expect(result.output.session_id).toBeUndefined();
    expect(result.output.comments).toEqual([]);
  });

  it('accepts failed output with missing summary, llm, and comments', () => {
    const result = parseOcrReviewOutput({ status: 'failed', message: 'provider failed' });

    expect(result.output.status).toBe('failed');
    expect(result.output.summary).toBeUndefined();
    expect(result.output.llm).toBeUndefined();
    expect(result.output.comments).toEqual([]);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseOcrReviewOutput('{ invalid')).toThrow(OcrContractError);
    try {
      parseOcrReviewOutput('{ invalid');
    } catch (error) {
      expect((error as OcrContractError).code).toBe('INVALID_JSON');
    }
  });

  it('rejects complete output with an invalid summary', () => {
    expect(() => parseOcrReviewOutput({
      status: 'complete',
      llm: { provider: 'provider', model: 'model' },
      summary: { comments: 1 },
      comments: [],
    })).toThrow('Complete OCR output is missing a valid summary');
  });

  it('skips a malformed comment while keeping valid findings', () => {
    const result = parseOcrReviewOutput({
      status: 'complete',
      llm: { provider: 'provider', model: 'model' },
      summary: {
        files_reviewed: 1,
        comments: 2,
        total_tokens: 1,
        input_tokens: 1,
        output_tokens: 0,
        cache_read_tokens: 0,
        elapsed: '1s',
      },
      comments: [
        successFixture.comments[0],
        { path: 'src/bad.ts', content: 'missing lines', category: 'bug', severity: 'high' },
      ],
    });

    expect(result.output.comments).toHaveLength(1);
    expect(result.skippedComments).toBe(1);
    expect(result.warnings[0]).toContain('index 1');
  });
});
