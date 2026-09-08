import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DiffViewer from '../components/DiffViewer';

vi.mock('react-diff-viewer', () => ({
  DiffMethod: { WORDS: 'WORDS' },
  default: (props: { oldValue: string; newValue: string; splitView: boolean }) => (
    <div
      data-testid="react-diff-viewer"
      data-old-value={props.oldValue}
      data-new-value={props.newValue}
      data-split-view={String(props.splitView)}
    />
  ),
}));

describe('DiffViewer', () => {
  it('should forward oldCode/newCode as oldValue/newValue to react-diff-viewer', () => {
    render(<DiffViewer oldCode="old line" newCode="new line" />);

    const viewer = screen.getByTestId('react-diff-viewer');
    expect(viewer.getAttribute('data-old-value')).toBe('old line');
    expect(viewer.getAttribute('data-new-value')).toBe('new line');
    expect(viewer.getAttribute('data-split-view')).toBe('false');
  });
});
