import { buildAnalyzerPrompt, parseAnalyzerResponse } from '../services/analyzerService';
import type { FileInfo } from '../../../shared/types';

describe('analyzerService', () => {
  describe('buildAnalyzerPrompt', () => {
    it('should build a prompt containing PR title and file list', () => {
      const prTitle = 'Fix login bug';
      const prBody = 'This fixes the login redirect issue';
      const files: FileInfo[] = [
        {
          sha: 'abc123',
          filename: 'src/login.ts',
          status: 'modified',
          additions: 10,
          deletions: 5,
          changes: 15,
          patch: '@@ -1,5 +1,10 @@\n+function login() {}',
        },
      ];
      const diff = 'diff --git a/src/login.ts b/src/login.ts\n...';

      const prompt = buildAnalyzerPrompt(prTitle, prBody, files, diff);

      expect(prompt).toContain('Fix login bug');
      expect(prompt).toContain('src/login.ts');
      expect(prompt).toContain('JSON');
      expect(prompt).toMatch(/json|JSON/);
    });
  });

  describe('parseAnalyzerResponse', () => {
    it('should parse a real model response (summary + fileAnalyses only)', () => {
      const jsonResponse = JSON.stringify({
        summary: {
          riskLevel: 'medium',
          score: 75,
          overview: 'Good changes overall',
          recommendations: [
            {
              priority: 'high',
              category: 'security',
              title: 'XSS vulnerability',
              description: 'Unsanitized user input',
            },
          ],
        },
        fileAnalyses: [
          {
            filename: 'src/login.ts',
            status: 'modified',
            riskLevel: 'medium',
            summary: 'Login logic looks good',
            suggestions: [
              {
                lineStart: 5,
                category: 'security',
                severity: 'major',
                title: 'Validate input',
                description: 'Add input validation',
              },
            ],
          },
        ],
      });

      const result = parseAnalyzerResponse(jsonResponse);

      expect(result.summary.riskLevel).toBe('medium');
      expect(result.summary.score).toBe(75);
      expect(result.fileAnalyses).toHaveLength(1);
      expect(result.fileAnalyses[0].filename).toBe('src/login.ts');
      expect(result.fileAnalyses[0].suggestions).toHaveLength(1);
      expect(result).not.toHaveProperty('aiUsage');
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const markdownResponse = '```json\n' + JSON.stringify({
        summary: { riskLevel: 'low', score: 90, overview: 'LGTM', recommendations: [] },
        fileAnalyses: [],
      }) + '\n```';

      const result = parseAnalyzerResponse(markdownResponse);
      expect(result.summary.riskLevel).toBe('low');
    });

    it('should throw when required fields are missing', () => {
      const incompleteResponse = JSON.stringify({ fileAnalyses: [] });

      expect(() => parseAnalyzerResponse(incompleteResponse)).toThrow(
        'Missing required fields in AI response',
      );
    });

    it('should throw for unparseable response', () => {
      expect(() => parseAnalyzerResponse('not valid json at all'))
        .toThrow('Failed to parse AI response');
    });
  });
});
