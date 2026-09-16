import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FindingPopover from '../components/FindingPopover';
import type { Finding } from '@/types';

const finding: Finding = {
  path: 'src/a.ts',
  content: '**注意**：请使用参数化查询，避免拼接 SQL。',
  startLine: 10,
  endLine: 12,
  category: 'security',
  severity: 'critical',
  suggestionCode: 'const sql = query(\'SELECT * FROM users WHERE id = ?\', [id]);',
};

describe('FindingPopover', () => {
  it('should render severity, content preview and line range', () => {
    render(<FindingPopover finding={finding} />);

    expect(screen.getByText(/注意/)).toBeInTheDocument();
    expect(screen.getByText('严重')).toBeInTheDocument();
    expect(screen.getByText(/第 10-12 行/)).toBeInTheDocument();
  });

  it('should expand the markdown content on click', async () => {
    const user = userEvent.setup();
    render(<FindingPopover finding={finding} />);

    await user.click(screen.getByText(/注意/));
    expect((await screen.findAllByText(/请使用参数化查询/)).length).toBeGreaterThan(0);
  });
});
