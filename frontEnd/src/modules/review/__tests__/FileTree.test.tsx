import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileTree from '../components/FileTree';
import type { FileInfo, FileAnalysis } from '@/types';

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

const fileAnalyses: FileAnalysis[] = [
  {
    filename: 'src/a.ts',
    status: 'modified',
    riskLevel: 'high',
    summary: 'risky change',
    suggestions: [],
  },
];

describe('FileTree', () => {
  it('should render filenames with additions/deletions', () => {
    render(
      <FileTree files={files} fileAnalyses={fileAnalyses} selectedFile={null} onSelectFile={vi.fn()} />,
    );

    expect(screen.getByText('src/a.ts')).toBeInTheDocument();
    expect(screen.getByText('src/b.ts')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('should render a risk dot when the file has a high-risk analysis', () => {
    const { container } = render(
      <FileTree files={files} fileAnalyses={fileAnalyses} selectedFile={null} onSelectFile={vi.fn()} />,
    );

    // 高风险的 a.ts 显示风险点；b.ts 无分析不显示
    const riskDots = container.querySelectorAll('span[style*="background-color"]');
    expect(riskDots.length).toBe(1);
    expect((riskDots[0] as HTMLElement).style.backgroundColor).toBe('rgb(255, 82, 82)');
  });

  it('should call onSelectFile with the filename on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FileTree files={files} fileAnalyses={fileAnalyses} selectedFile={null} onSelectFile={onSelect} />,
    );

    await user.click(screen.getByText('src/b.ts'));
    expect(onSelect).toHaveBeenCalledWith('src/b.ts');
  });
});
