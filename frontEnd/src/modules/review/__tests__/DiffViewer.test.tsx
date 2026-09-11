import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { viewerMock } = vi.hoisted(() => ({
  viewerMock: vi.fn(),
}));

vi.mock('react-diff-viewer', () => ({
  DiffMethod: { WORDS: 'WORDS' },
  default: { default: viewerMock },
}));

import DiffViewer, { resolveReactDiffViewerComponent } from '../components/DiffViewer';

interface ViewerProps {
  oldValue: string;
  newValue: string;
  splitView: boolean;
}

describe('resolveReactDiffViewerComponent', () => {
  it('supports direct and nested default exports', () => {
    const directExport = vi.fn();
    const nestedExport = { default: directExport };

    expect(resolveReactDiffViewerComponent(directExport)).toBe(directExport);
    expect(resolveReactDiffViewerComponent(nestedExport)).toBe(directExport);
  });
});

describe('DiffViewer', () => {
  it('forwards oldCode/newCode as oldValue/newValue to react-diff-viewer', () => {
    viewerMock.mockImplementation((props: ViewerProps): ReactNode => (
      <div
        data-testid="react-diff-viewer"
        data-old-value={props.oldValue}
        data-new-value={props.newValue}
        data-split-view={String(props.splitView)}
      />
    ));

    render(<DiffViewer oldCode="old line" newCode="new line" />);

    const viewer = screen.getByTestId('react-diff-viewer');
    expect(viewer.getAttribute('data-old-value')).toBe('old line');
    expect(viewer.getAttribute('data-new-value')).toBe('new line');
    expect(viewer.getAttribute('data-split-view')).toBe('false');
  });
});
