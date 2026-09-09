import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

function MockViewer(props: { oldValue: string; newValue: string; splitView: boolean }): ReactNode {
  return (
    <div
      data-testid="react-diff-viewer"
      data-old-value={props.oldValue}
      data-new-value={props.newValue}
      data-split-view={String(props.splitView)}
    />
  );
}

/**
 * Re-import DiffViewer with a specific shape for `react-diff-viewer`'s default export:
 * - bundler/test interop -> the component itself
 * - Vite 8 dev (pure CJS dep, `__esModule` + `exports.default`) -> the whole module.exports object
 */
async function importWithRdvDefault(moduleDefault: unknown) {
  vi.resetModules();
  vi.doMock('react-diff-viewer', () => ({
    DiffMethod: { WORDS: 'WORDS' },
    default: moduleDefault as never,
  }));
  const { default: DiffViewer } = await import('../components/DiffViewer');
  return DiffViewer;
}

describe('DiffViewer', () => {
  it('should forward oldCode/newCode as oldValue/newValue to react-diff-viewer', async () => {
    const DiffViewer = await importWithRdvDefault(MockViewer);
    render(<DiffViewer oldCode="old line" newCode="new line" />);

    const viewer = screen.getByTestId('react-diff-viewer');
    expect(viewer.getAttribute('data-old-value')).toBe('old line');
    expect(viewer.getAttribute('data-new-value')).toBe('new line');
    expect(viewer.getAttribute('data-split-view')).toBe('false');
  });

  it('should unwrap the Vite 8 dev default export (module.exports object with .default)', async () => {
    // Vite 8 预打包纯 CJS 依赖时，默认导出是 { default: Component, DiffMethod, ... } 对象
    const DiffViewer = await importWithRdvDefault({ default: MockViewer });
    render(<DiffViewer oldCode="old line" newCode="new line" />);

    expect(screen.getByTestId('react-diff-viewer')).toBeInTheDocument();
  });
});
