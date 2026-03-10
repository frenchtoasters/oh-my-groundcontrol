import { describe, expect, it } from 'bun:test';
import {
  applyAppend,
  applyInsertAfter,
  applyPrepend,
  applyReplaceLines,
  applySetLine,
} from './edit-operation-primitives';
import {
  applyHashlineEdits,
  applyHashlineEditsWithReport,
} from './edit-operations';
import { computeLineHash } from './hash-computation';
import type { HashlineEdit } from './types';

function anchorFor(lines: string[], line: number): string {
  return `${line}#${computeLineHash(line, lines[line - 1])}`;
}

describe('hashline edit operations', () => {
  it('applies set_line with LINE#ID anchor', () => {
    const lines = ['line 1', 'line 2', 'line 3'];

    const result = applySetLine(lines, anchorFor(lines, 2), 'new line 2');

    expect(result).toEqual(['line 1', 'new line 2', 'line 3']);
  });

  it('applies replace_lines with LINE#ID anchors', () => {
    const lines = ['line 1', 'line 2', 'line 3', 'line 4'];

    const result = applyReplaceLines(
      lines,
      anchorFor(lines, 2),
      anchorFor(lines, 3),
      'replaced',
    );

    expect(result).toEqual(['line 1', 'replaced', 'line 4']);
  });

  it('applies insert_after with LINE#ID anchor', () => {
    const lines = ['line 1', 'line 2', 'line 3'];

    const result = applyInsertAfter(lines, anchorFor(lines, 2), 'inserted');

    expect(result).toEqual(['line 1', 'line 2', 'inserted', 'line 3']);
  });

  it('applies insert_before via applyHashlineEdits', () => {
    const lines = ['line 1', 'line 2', 'line 3'];

    const result = applyHashlineEdits(lines.join('\n'), [
      {
        op: 'prepend',
        pos: anchorFor(lines, 2),
        lines: 'before 2',
      },
    ]);

    expect(result).toEqual('line 1\nbefore 2\nline 2\nline 3');
  });

  it('throws when insert_after receives empty text array', () => {
    const lines = ['line 1', 'line 2'];

    expect(() => applyInsertAfter(lines, anchorFor(lines, 1), [])).toThrow(
      /non-empty/i,
    );
  });

  it('throws when insert_before receives empty text array', () => {
    const lines = ['line 1', 'line 2'];

    expect(() =>
      applyHashlineEdits(lines.join('\n'), [
        {
          op: 'prepend',
          pos: anchorFor(lines, 1),
          lines: [],
        },
      ]),
    ).toThrow(/non-empty/i);
  });

  it('applies mixed edits in one pass', () => {
    const content = 'line 1\nline 2\nline 3';
    const lines = content.split('\n');
    const edits: HashlineEdit[] = [
      {
        op: 'append',
        pos: anchorFor(lines, 1),
        lines: 'inserted',
      },
      {
        op: 'replace',
        pos: anchorFor(lines, 3),
        lines: 'modified',
      },
    ];

    const result = applyHashlineEdits(content, edits);

    expect(result).toEqual('line 1\ninserted\nline 2\nmodified');
  });

  it('applies replace before prepend when both target same line', () => {
    const content = 'line 1\nline 2\nline 3';
    const lines = content.split('\n');
    const edits: HashlineEdit[] = [
      {
        op: 'prepend',
        pos: anchorFor(lines, 2),
        lines: 'before line 2',
      },
      {
        op: 'replace',
        pos: anchorFor(lines, 2),
        lines: 'modified line 2',
      },
    ];

    const result = applyHashlineEdits(content, edits);

    expect(result).toEqual('line 1\nbefore line 2\nmodified line 2\nline 3');
  });

  it('deduplicates identical insert edits in one pass', () => {
    const content = 'line 1\nline 2';
    const lines = content.split('\n');
    const edits: HashlineEdit[] = [
      {
        op: 'append',
        pos: anchorFor(lines, 1),
        lines: 'inserted',
      },
      {
        op: 'append',
        pos: anchorFor(lines, 1),
        lines: 'inserted',
      },
    ];

    const result = applyHashlineEdits(content, edits);

    expect(result).toEqual('line 1\ninserted\nline 2');
  });

  it('keeps literal backslash-n in plain string text', () => {
    const lines = ['line 1', 'line 2', 'line 3'];

    const result = applySetLine(lines, anchorFor(lines, 2), 'join(\\n)');

    expect(result).toEqual(['line 1', 'join(\\n)', 'line 3']);
  });

  it('strips copied hashline prefixes from multiline text', () => {
    const lines = ['line 1', 'line 2', 'line 3'];

    const result = applySetLine(
      lines,
      anchorFor(lines, 2),
      '1#VK|first\n2#NP|second',
    );

    expect(result).toEqual(['line 1', 'first', 'second', 'line 3']);
  });

  it('autocorrects anchor echo for insert_after payload', () => {
    const lines = ['line 1', 'line 2'];

    const result = applyInsertAfter(lines, anchorFor(lines, 1), [
      'line 1',
      'inserted',
    ]);

    expect(result).toEqual(['line 1', 'inserted', 'line 2']);
  });

  it('throws when insert_after payload only repeats anchor line', () => {
    const lines = ['line 1', 'line 2'];

    expect(() =>
      applyInsertAfter(lines, anchorFor(lines, 1), ['line 1']),
    ).toThrow(/non-empty/i);
  });

  it('restores indentation for paired single-line replacement', () => {
    const lines = ['if (x) {', '  return 1', '}'];

    const result = applySetLine(lines, anchorFor(lines, 2), 'return 2');

    expect(result).toEqual(['if (x) {', '  return 2', '}']);
  });

  it('preserves intentional indentation removal (tab to no-tab)', () => {
    const lines = ['# Title', '\t1절', 'content'];

    const result = applySetLine(lines, anchorFor(lines, 2), '1절');

    expect(result).toEqual(['# Title', '1절', 'content']);
  });

  it('preserves intentional indentation removal (spaces to no-spaces)', () => {
    const lines = ['function foo() {', '    indented', '}'];

    const result = applySetLine(lines, anchorFor(lines, 2), 'indented');

    expect(result).toEqual(['function foo() {', 'indented', '}']);
  });

  it('strips boundary echo around replace_lines content', () => {
    const lines = ['before', 'old 1', 'old 2', 'after'];

    const result = applyReplaceLines(
      lines,
      anchorFor(lines, 2),
      anchorFor(lines, 3),
      ['before', 'new 1', 'new 2', 'after'],
    );

    expect(result).toEqual(['before', 'new 1', 'new 2', 'after']);
  });

  it('restores indentation for first replace_lines entry', () => {
    const lines = ['if (x) {', '  return 1', '  return 2', '}'];

    const result = applyReplaceLines(
      lines,
      anchorFor(lines, 2),
      anchorFor(lines, 3),
      ['return 3', 'return 4'],
    );

    expect(result).toEqual(['if (x) {', '  return 3', 'return 4', '}']);
  });

  it('preserves blank lines and indentation in range replace', () => {
    const lines = [
      '',
      '동해물과 백두산이 마르고 닳도록',
      '하느님이 보우하사 우리나라 만세',
      '',
      '무궁화 삼천리 화려강산',
      '대한사람 대한으로 길이 보전하세',
      '',
    ];

    const result = applyReplaceLines(
      lines,
      anchorFor(lines, 1),
      anchorFor(lines, 7),
      [
        '',
        '  동해물과 백두산이 마르고 닳도록',
        '  하느님이 보우하사 우리나라 만세',
        '',
        '  무궁화 삼천리 화려강산',
        '  대한사람 대한으로 길이 보전하세',
        '',
      ],
    );

    expect(result).toEqual([
      '',
      '  동해물과 백두산이 마르고 닳도록',
      '  하느님이 보우하사 우리나라 만세',
      '',
      '  무궁화 삼천리 화려강산',
      '  대한사람 대한으로 길이 보전하세',
      '',
    ]);
  });

  it('collapses wrapped replacement span back to unique original single line', () => {
    const lines = [
      'const request = buildRequest({ method: "GET", retries: 3 })',
      'const done = true',
    ];

    const result = applyReplaceLines(
      lines,
      anchorFor(lines, 1),
      anchorFor(lines, 1),
      ['const request = buildRequest({', 'method: "GET", retries: 3 })'],
    );

    expect(result).toEqual([
      'const request = buildRequest({ method: "GET", retries: 3 })',
      'const done = true',
    ]);
  });

  it('keeps wrapped replacement when canonical match is not unique', () => {
    const lines = [
      'const query = a + b',
      'const query = a+b',
      'const done = true',
    ];

    const result = applyReplaceLines(
      lines,
      anchorFor(lines, 1),
      anchorFor(lines, 2),
      ['const query = a +', 'b'],
    );

    expect(result).toEqual(['const query = a +', 'b', 'const done = true']);
  });

  it('applies append and prepend operations', () => {
    const content = 'line 1\nline 2';

    const result = applyHashlineEdits(content, [
      { op: 'append', lines: ['line 3'] },
      { op: 'prepend', lines: ['line 0'] },
    ]);

    expect(result).toEqual('line 0\nline 1\nline 2\nline 3');
  });

  it('appends to empty file without extra blank line', () => {
    const lines = [''];

    const result = applyAppend(lines, ['line1']);

    expect(result).toEqual(['line1']);
  });

  it('prepends to empty file without extra blank line', () => {
    const lines = [''];

    const result = applyPrepend(lines, ['line1']);

    expect(result).toEqual(['line1']);
  });

  it('autocorrects single-line merged replacement', () => {
    const lines = ['const a = 1;', 'const b = 2;'];

    const result = applyReplaceLines(
      lines,
      anchorFor(lines, 1),
      anchorFor(lines, 2),
      'const a = 10; const b = 20;',
    );

    expect(result).toEqual(['const a = 10;', 'const b = 20;']);
  });

  it('throws on overlapping range edits', () => {
    const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
    const lines = content.split('\n');
    const edits: HashlineEdit[] = [
      {
        op: 'replace',
        pos: anchorFor(lines, 1),
        end: anchorFor(lines, 3),
        lines: 'replaced A',
      },
      {
        op: 'replace',
        pos: anchorFor(lines, 2),
        end: anchorFor(lines, 4),
        lines: 'replaced B',
      },
    ];

    expect(() => applyHashlineEdits(content, edits)).toThrow(/overlapping/i);
  });

  it('allows non-overlapping range edits', () => {
    const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
    const lines = content.split('\n');
    const edits: HashlineEdit[] = [
      {
        op: 'replace',
        pos: anchorFor(lines, 1),
        end: anchorFor(lines, 2),
        lines: 'replaced A',
      },
      {
        op: 'replace',
        pos: anchorFor(lines, 4),
        end: anchorFor(lines, 5),
        lines: 'replaced B',
      },
    ];

    const result = applyHashlineEdits(content, edits);

    expect(result).toEqual('replaced A\nline 3\nreplaced B');
  });
});

describe('dedupe anchor canonicalization', () => {
  it('deduplicates edits with whitespace-variant anchors', () => {
    const content = 'line 1\nline 2';
    const lines = content.split('\n');
    const canonical = `1#${computeLineHash(1, lines[0])}`;
    const spaced = ` 1 # ${computeLineHash(1, lines[0])} `;

    const report = applyHashlineEditsWithReport(content, [
      {
        op: 'append',
        pos: canonical,
        lines: ['inserted'],
      },
      {
        op: 'append',
        pos: spaced,
        lines: ['inserted'],
      },
    ]);

    expect(report.deduplicatedEdits).toBe(1);
    expect(report.content).toBe('line 1\ninserted\nline 2');
  });
});
