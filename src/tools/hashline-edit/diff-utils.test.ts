import { describe, expect, it } from 'bun:test';
import { parsePatch } from 'diff';
import { generateUnifiedDiff } from './diff-utils';

function createNumberedLines(totalLineCount: number): string {
  return Array.from(
    { length: totalLineCount },
    (_, index) => `line ${index + 1}`,
  ).join('\n');
}

describe('generateUnifiedDiff', () => {
  describe('OpenCode compatibility format', () => {
    it('includes the Index header', () => {
      const diff = generateUnifiedDiff('a\n', 'b\n', 'test.ts');

      expect(diff).toContain('Index: test.ts');
    });

    it('includes unified file headers', () => {
      const diff = generateUnifiedDiff('a\n', 'b\n', 'test.ts');

      expect(diff).toContain('--- test.ts');
      expect(diff).toContain('+++ test.ts');
    });

    it('remains parseable by parsePatch', () => {
      const diff = generateUnifiedDiff(
        'line1\nline2\n',
        'line1\nline2-updated\n',
        'test.ts',
      );
      const patches = parsePatch(diff);

      expect(patches).toHaveLength(1);
      expect(patches[0]?.oldFileName).toBe('test.ts');
      expect(patches[0]?.newFileName).toBe('test.ts');
      expect(patches[0]?.hunks).toHaveLength(1);
    });
  });

  describe('content without trailing newline', () => {
    it('keeps no-newline markers parseable', () => {
      const diff = generateUnifiedDiff('a', 'b', 'test.ts');
      const patches = parsePatch(diff);
      const hunkLines = patches[0]?.hunks[0]?.lines ?? [];

      expect(diff).toContain('\\ No newline at end of file');
      expect(hunkLines).toEqual([
        '-a',
        '\\ No newline at end of file',
        '+b',
        '\\ No newline at end of file',
      ]);
    });
  });

  it('creates separate hunks for distant changes', () => {
    const oldContent = createNumberedLines(60);
    const newLines = oldContent.split('\n');
    newLines[4] = 'line 5 updated';
    newLines[49] = 'line 50 updated';
    const newContent = newLines.join('\n');

    const diff = generateUnifiedDiff(oldContent, newContent, 'sample.txt');
    const hunkHeaders = diff.match(/^@@/gm) ?? [];

    expect(hunkHeaders.length).toBe(2);
  });

  it('creates a single hunk for adjacent changes', () => {
    const oldContent = createNumberedLines(20);
    const newLines = oldContent.split('\n');
    newLines[9] = 'line 10 updated';
    newLines[10] = 'line 11 updated';
    const newContent = newLines.join('\n');

    const diff = generateUnifiedDiff(oldContent, newContent, 'sample.txt');
    const hunkHeaders = diff.match(/^@@/gm) ?? [];

    expect(hunkHeaders.length).toBe(1);
    expect(diff).toContain(' line 8');
    expect(diff).toContain(' line 13');
  });

  it('limits each hunk to three context lines', () => {
    const oldContent = createNumberedLines(20);
    const newLines = oldContent.split('\n');
    newLines[9] = 'line 10 updated';
    const newContent = newLines.join('\n');

    const diff = generateUnifiedDiff(oldContent, newContent, 'sample.txt');

    expect(diff).toContain(' line 7');
    expect(diff).toContain(' line 13');
    expect(diff).not.toContain(' line 6');
    expect(diff).not.toContain(' line 14');
  });

  it('returns a diff string for identical content', () => {
    const content = 'alpha\nbeta\ngamma';

    const diff = generateUnifiedDiff(content, content, 'sample.txt');

    expect(typeof diff).toBe('string');
    expect(diff).toContain('--- sample.txt');
    expect(diff).toContain('+++ sample.txt');
  });

  it('returns a valid diff when old content is empty', () => {
    const diff = generateUnifiedDiff(
      '',
      'first line\nsecond line',
      'sample.txt',
    );

    expect(diff).toContain('--- sample.txt');
    expect(diff).toContain('+++ sample.txt');
    expect(diff).toContain('+first line');
  });
});
