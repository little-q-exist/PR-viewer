import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuggestionPopover from '../components/SuggestionPopover';
import type { Suggestion } from '@/types';

const suggestion: Suggestion = {
  lineStart: 10,
  lineEnd: 12,
  category: 'security',
  severity: 'critical',
  title: 'SQL 注入风险',
  description: '**注意**：请使用参数化查询，避免拼接 SQL。',
  suggestionCode: 'const sql = query(\'SELECT * FROM users WHERE id = ?\', [id]);',
};

describe('SuggestionPopover', () => {
  it('should render severity, title and line range', () => {
    render(<SuggestionPopover suggestion={suggestion} />);

    expect(screen.getByText('SQL 注入风险')).toBeInTheDocument();
    expect(screen.getByText('严重')).toBeInTheDocument();
    expect(screen.getByText(/第 10-12 行/)).toBeInTheDocument();
  });

  it('should expand the markdown content on click', async () => {
    const user = userEvent.setup();
    render(<SuggestionPopover suggestion={suggestion} />);

    await user.click(screen.getByText('SQL 注入风险'));
    expect(await screen.findByText(/请使用参数化查询/)).toBeInTheDocument();
  });
});
