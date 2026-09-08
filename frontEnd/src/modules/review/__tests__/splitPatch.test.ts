import { describe, it, expect } from 'vitest';
import { splitPatchIntoOldNew } from '../utils/splitPatch';

describe('splitPatchIntoOldNew', () => {
  it('should return empty strings for undefined/empty patch', () => {
    expect(splitPatchIntoOldNew()).toEqual({ oldCode: '', newCode: '' });
    expect(splitPatchIntoOldNew('')).toEqual({ oldCode: '', newCode: '' });
  });

  it('should split +/- lines and append context lines to both sides', () => {
    const patch = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 111..222 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,3 +1,3 @@',
      " import { x } from './x';",
      '-const oldValue = 1;',
      '+const newValue = 2;',
      ' const keep = 3;',
    ].join('\n');

    expect(splitPatchIntoOldNew(patch)).toEqual({
      oldCode: "import { x } from './x';\nconst oldValue = 1;\nconst keep = 3;",
      newCode: "import { x } from './x';\nconst newValue = 2;\nconst keep = 3;",
    });
  });

  it('should normalize CRLF line endings', () => {
    const patch = '--- a/src/a.ts\r\n+++ b/src/a.ts\r\n@@ -1 +1 @@\r\n-old\r\n+new\r\n';
    expect(splitPatchIntoOldNew(patch)).toEqual({ oldCode: 'old', newCode: 'new' });
  });

  it('should return empty oldCode for an added file', () => {
    const patch = [
      'diff --git a/src/new.ts b/src/new.ts',
      'new file mode 100644',
      'index 000..abc',
      '--- /dev/null',
      '+++ b/src/new.ts',
      '@@ -0,0 +1,2 @@',
      '+line one',
      '+line two',
    ].join('\n');

    expect(splitPatchIntoOldNew(patch)).toEqual({
      oldCode: '',
      newCode: 'line one\nline two',
    });
  });

  it('should return empty newCode for a removed file', () => {
    const patch = [
      'diff --git a/src/old.ts b/src/old.ts',
      'deleted file mode 100644',
      'index abc..000',
      '--- a/src/old.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-line one',
      '-line two',
    ].join('\n');

    expect(splitPatchIntoOldNew(patch)).toEqual({
      oldCode: 'line one\nline two',
      newCode: '',
    });
  });

  it('should skip meta lines and the no-newline marker', () => {
    const patch = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 111..222 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
      '\\ No newline at end of file',
    ].join('\n');

    expect(splitPatchIntoOldNew(patch)).toEqual({ oldCode: 'old', newCode: 'new' });
  });

  it('should preserve the first character of content lines', () => {
    const patch = [
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1 +1 @@',
      '  indent',
      '+  added-with-indent',
      '-  removed-with-indent',
    ].join('\n');

    const { oldCode, newCode } = splitPatchIntoOldNew(patch);
    expect(oldCode).toContain(' removed-with-indent');
    expect(newCode).toContain(' added-with-indent');
  });
});
