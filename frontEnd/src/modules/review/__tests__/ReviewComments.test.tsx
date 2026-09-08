import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewComments from '../components/ReviewComments';
import type { CommentInfo } from '@/types';

const comments: CommentInfo[] = [
  {
    id: 1,
    body: 'one: 建议抽成常量',
    author: { login: 'alice' },
    path: 'src/a.ts',
    line: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    body: 'two: 这里需要判空',
    author: { login: 'bob' },
    path: 'src/a.ts',
    line: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    body: 'three: 无行号评论',
    author: { login: 'carol' },
    path: 'src/a.ts',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('ReviewComments', () => {
  it('should render nothing when there are no comments', () => {
    const { container } = render(<ReviewComments comments={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should sort comments by line ascending and put line-less comments last', () => {
    render(<ReviewComments comments={comments} />);

    expect(screen.getByText('GitHub 评论 (3)')).toBeInTheDocument();

    const lineLabels = screen.getAllByText(/第 \d+ 行/).map((node) => node.textContent);
    expect(lineLabels).toEqual(['第 1 行', '第 3 行']);
    // 无行号评论排最后，显示“行级位置未知”
    expect(screen.getByText('行级位置未知')).toBeInTheDocument();
  });

  it('should expand the popover with author/body on click', async () => {
    const user = userEvent.setup();
    render(<ReviewComments comments={comments} />);

    await user.click(screen.getByText('@bob'));
    expect(await screen.findByText(/这里需要判空/)).toBeInTheDocument();
    // 展开后 Popover 头部与列表行都会出现作者名\n    expect(await screen.findAllByText('@bob')).toHaveLength(2);
  });
});
