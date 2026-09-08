export interface SplitPatchResult {
  oldCode: string;
  newCode: string;
}

/**
 * 把 GitHub per-file unified diff patch 拆成 react-diff-viewer 需要的
 * oldCode / newCode 两段内容。
 *
 * - `+` 行 → newCode；`-` 行 → oldCode；上下文（首字符为空格）行 → 同时追加。
 * - 跳过 hunk 头（@@）、文件头（--- / +++）、diff --git / index / mode /
 *   rename / Binary 等元信息，以及 `\ No newline at end of file`。
 * - added 文件（全部为 + 行）oldCode 为空；removed 文件（全部为 - 行）newCode 为空。
 */
const META_LINE_PATTERNS: RegExp[] = [
  /^@@/,
  /^--- /,
  /^\+\+\+ /,
  /^diff --git /,
  /^index /,
  /^new file mode /,
  /^deleted file mode /,
  /^old mode /,
  /^new mode /,
  /^rename (from|to) /,
  /^similarity index /,
  /^dissimilarity index /,
  /^Binary files /,
  /^GIT binary patch/,
  /^\\ No newline at end of file$/,
];

function isMetaLine(line: string): boolean {
  return META_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

export function splitPatchIntoOldNew(patch?: string): SplitPatchResult {
  if (!patch) {
    return { oldCode: '', newCode: '' };
  }

  const lines = patch.replace(/\r\n/g, '\n').split('\n');
  // 去掉末尾由换行符产生的空元素
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine;
    if (isMetaLine(line)) {
      continue;
    }

    if (line.startsWith('+')) {
      newLines.push(line.slice(1));
    } else if (line.startsWith('-')) {
      oldLines.push(line.slice(1));
    } else {
      // 上下文行（首字符为空格）或 hunk 间的空行：两侧都保留
      const content = line.startsWith(' ') ? line.slice(1) : line;
      oldLines.push(content);
      newLines.push(content);
    }
  }

  return {
    oldCode: oldLines.join('\n'),
    newCode: newLines.join('\n'),
  };
}
