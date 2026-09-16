import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileTree from '../components/FileTree';
import type { FileInfo, Finding } from '@/types';

const files: FileInfo[] = [
  {
    sha: 'sha-a',
    filename: 'src/a.ts',
    status: 'modified',
    additions: 3,
    deletions: 1,
    changes: 4,
    patch: '',
  },
  {
    sha: 'sha-b',
    filename: 'src/b.ts',
    status: 'added',
    additions: 5,
    deletions: 0,
    changes: 5,
  },
];

const findings: Finding[] = [
  {
    path: 'src/a.ts',
    content: 'risky change',
    startLine: 1,
    endLine: 1,
    category: 'logic',
    severity: 'critical',
  },
];

describe('FileTree', () => {
  it('should render filenames with additions/deletions', () => {
    render(
      <FileTree files={files} findings={findings} selectedFile={null} onSelectFile={vi.fn()} />,
    );

    expect(screen.getByText('src/a.ts')).toBeInTheDocument();
    expect(screen.getByText('src/b.ts')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('should render a severity dot when the file has findings', () => {
    const { container } = render(
      <FileTree files={files} findings={findings} selectedFile={null} onSelectFile={vi.fn()} />,
    );

    const dots = container.querySelectorAll('span[style*="background-color"]');
    expect(dots.length).toBe(1);
    expect((dots[0] as HTMLElement).style.backgroundColor).toBe('rgb(255, 82, 82)');
  });

  it('should call onSelectFile with the filename on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FileTree files={files} findings={findings} selectedFile={null} onSelectFile={onSelect} />,
    );

    await user.click(screen.getByText('src/b.ts'));
    expect(onSelect).toHaveBeenCalledWith('src/b.ts');
  });

  it('should show the full filename in a tooltip on hover', async () => {
    const user = userEvent.setup();
    const filename = 'src/components/very-long-component-name/with/deep/nesting/index.tsx';
    render(
      <FileTree
        files={[{ ...files[0], filename }]}
        findings={[]}
        selectedFile={null}
        onSelectFile={vi.fn()}
      />,
    );

    await user.hover(screen.getByText(filename));

    expect(await screen.findByRole('tooltip')).toHaveTextContent(filename);
  });
});
