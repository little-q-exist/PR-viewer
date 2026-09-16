import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChangesTab from '../components/ChangesTab';
import type { Review, PullRequest, CommentInfo, Finding } from '@/types';

vi.mock('../components/DiffViewer', () => ({
  default: (props: { oldCode: string; newCode: string }) => (
    <div data-testid="diff-viewer-mock" data-old-code={props.oldCode} data-new-code={props.newCode} />
  ),
}));

function makeReview(comments?: CommentInfo[], findings: Finding[] = []): Review {
  const pr: PullRequest = {
    _id: 'pr-1',
    url: 'https://github.com/o/r/pull/1',
    owner: 'o',
    repo: 'r',
    pullNumber: 1,
    title: 'Fix login',
    state: 'open',
    author: { login: 'alice', avatarUrl: '' },
    baseBranch: 'main',
    headBranch: 'dev',
    files: [
      {
        sha: 's1',
        filename: 'src/a.ts',
        status: 'modified',
        additions: 2,
        deletions: 1,
        changes: 3,
        patch: '--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-old\n+new\n',
      },
    ],
    comments,
    fetchedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  return {
    _id: 'review-1',
    userId: 'user-1',
    prId: pr,
    status: 'completed',
    engine: 'legacy',
    engineVersion: 'analyzer-v1',
    runSummary: {
      filesReviewed: 1,
      comments: findings.length,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      elapsed: '',
    },
    findings,
    groups: [],
    warnings: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ChangesTab', () => {
  it('should pass split oldCode/newCode to DiffViewer instead of the raw patch', () => {
    render(<ChangesTab review={makeReview()} />);

    const diffViewer = screen.getByTestId('diff-viewer-mock');
    expect(diffViewer.getAttribute('data-old-code')).toBe('old');
    expect(diffViewer.getAttribute('data-new-code')).toBe('new');
    expect(diffViewer.getAttribute('data-new-code')).not.toContain('@@');
  });

  it('should render GitHub comments for the selected file', () => {
    const comments: CommentInfo[] = [
      {
        id: 1,
        body: '请使用可选链',
        author: { login: 'alice' },
        path: 'src/a.ts',
        line: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        body: '另一个文件的评论不应出现',
        author: { login: 'bob' },
        path: 'src/other.ts',
        line: 2,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    render(<ChangesTab review={makeReview(comments)} />);
    expect(screen.getByText('GitHub 评论 (1)')).toBeInTheDocument();
    expect(screen.queryByText(/另一个文件的评论不应出现/)).not.toBeInTheDocument();
  });

  it('should show an empty state when there are no files', () => {
    const review: Review = makeReview();
    if (typeof review.prId === 'object') {
      review.prId = { ...review.prId, files: [] };
    }
    render(<ChangesTab review={review} />);
    expect(screen.getByText('选择一个文件查看变更')).toBeInTheDocument();
  });

  it('should render findings for the selected file', () => {
    const findings: Finding[] = [{
      path: 'src/a.ts',
      content: 'Use a safe query',
      startLine: 1,
      endLine: 1,
      category: 'security',
      severity: 'major',
    }];

    render(<ChangesTab review={makeReview(undefined, findings)} />);

    expect(screen.getByText('AI 问题 (1)')).toBeInTheDocument();
    expect(screen.getByText(/Use a safe query/)).toBeInTheDocument();
  });
});
