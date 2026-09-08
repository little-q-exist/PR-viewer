import axios from 'axios';
import type { FileInfo, AnalyzerResult } from '../../../shared/types';

export function buildAnalyzerPrompt(
    prTitle: string,
    prBody: string | null,
    files: FileInfo[],
    diff: string,
): string {
    const fileList = files
        .map(
            (f) =>
                `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`,
        )
        .join('\n');

    return `You are a senior code reviewer. Analyze the following Pull Request and produce a structured JSON review.

## PR Title
${prTitle}

## PR Description
${prBody || 'No description provided'}

## Changed Files
${fileList}

## Full Diff
\`\`\`diff
${diff.slice(0, 80000)}
\`\`\`

## Instructions

Return ONLY a JSON object (no markdown, no other text) with this structure:

{
  "summary": {
    "riskLevel": "low" | "medium" | "high",
    "score": <0-100>,
    "overview": "<Markdown summary of the PR>",
    "recommendations": [
      {
        "priority": "high" | "medium" | "low",
        "category": "security" | "performance" | "style" | "logic" | "maintainability",
        "title": "<short title>",
        "description": "<detailed explanation in Markdown>"
      }
    ]
  },
  "fileAnalyses": [
    {
      "filename": "<path>",
      "status": "added" | "modified" | "removed",
      "riskLevel": "low" | "medium" | "high",
      "summary": "<brief assessment of this file>",
      "suggestions": [
        {
          "lineStart": <line number>,
          "lineEnd": <optional line number>,
          "category": "security" | "performance" | "style" | "logic" | "maintainability",
          "severity": "critical" | "major" | "minor" | "nit",
          "title": "<short title>",
          "description": "<detailed suggestion in Markdown>",
          "suggestionCode": "<optional code fix>"
        }
      ]
    }
  ]
}

For each changed file, analyze it. Focus on:
- Security vulnerabilities
- Performance issues
- Logic errors
- Code style and maintainability
- Edge cases and error handling

Be specific — reference exact line numbers from the diff.`;
}

export function parseAnalyzerResponse(
    response: string,
): Omit<AnalyzerResult, 'aiUsage'> {
    let cleaned = response.trim();

    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        cleaned = jsonMatch[1].trim();
    }

    try {
        const parsed = JSON.parse(cleaned);

        if (!parsed.summary || !parsed.fileAnalyses) {
            throw new Error('Missing required fields in AI response');
        }

        return parsed as Omit<AnalyzerResult, 'aiUsage'>;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Failed to parse AI response: invalid JSON');
        }
        throw error;
    }
}

export async function analyzePullRequest(
    prTitle: string,
    prBody: string | null,
    files: FileInfo[],
    diff: string,
): Promise<AnalyzerResult> {
    const apiUrl = process.env.OPENAI_API_URL;
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL;
    if (!apiKey || !model) {
        throw new Error('OPENAI_API_KEY or OPENAI_MODEL is not configured');
    }

    const prompt = buildAnalyzerPrompt(prTitle, prBody, files, diff);

    const response = await axios.post(
        apiUrl ?? 'https://api.openai.com/v1/chat/completions',
        {
            model,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a code review expert. Always respond with valid JSON only.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 8000,
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        },
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('Empty response from OpenAI');
    }

    const parsed = parseAnalyzerResponse(content);

    return {
        ...parsed,
        aiUsage: {
            model,
            promptTokens: response.data.usage?.prompt_tokens ?? 0,
            completionTokens: response.data.usage?.completion_tokens ?? 0,
            totalTokens: response.data.usage?.total_tokens ?? 0,
        },
    };
}
