import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MarkdownContent, { renderSafeMarkdown } from '../MarkdownContent';

describe('MarkdownContent', () => {
  it('renders supported markdown', () => {
    render(<MarkdownContent content="**重要**" />);

    expect(screen.getByText('重要').tagName).toBe('STRONG');
  });

  it('removes executable tags, event handlers and unsafe link protocols', () => {
    const { container } = render(
      <MarkdownContent
        content={[
          '<script>window.__xss = 1</script>',
          '<img src="x" onerror="window.__xss = 2">',
          '<iframe srcdoc="<script>window.__xss = 3</script>"></iframe>',
          '<a href="javascript:alert(1)">click</a>',
        ].join('')}
      />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('img')).not.toHaveAttribute('onerror');
    expect(screen.getByText('click')).not.toHaveAttribute('href');
    expect((window as typeof window & { __xss?: number }).__xss).toBeUndefined();
  });

  it('sanitizes raw HTML before returning it', () => {
    expect(renderSafeMarkdown('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
  });
});
