import { describe, expect, it } from 'bun:test';
import {
  normalizeHashlineEdits,
  type RawHashlineEdit,
} from './normalize-edits';

describe('normalizeHashlineEdits', () => {
  it('maps replace with pos to replace', () => {
    const input: RawHashlineEdit[] = [
      { op: 'replace', pos: '2#VK', lines: 'updated' },
    ];

    const result = normalizeHashlineEdits(input);

    expect(result).toEqual([{ op: 'replace', pos: '2#VK', lines: 'updated' }]);
  });

  it('maps replace with pos and end to replace', () => {
    const input: RawHashlineEdit[] = [
      {
        op: 'replace',
        pos: '2#VK',
        end: '4#MB',
        lines: ['a', 'b'],
      },
    ];

    const result = normalizeHashlineEdits(input);

    expect(result).toEqual([
      {
        op: 'replace',
        pos: '2#VK',
        end: '4#MB',
        lines: ['a', 'b'],
      },
    ]);
  });

  it('maps anchored append and prepend preserving op', () => {
    const input: RawHashlineEdit[] = [
      { op: 'append', pos: '2#VK', lines: ['after'] },
      { op: 'prepend', pos: '4#MB', lines: ['before'] },
    ];

    const result = normalizeHashlineEdits(input);

    expect(result).toEqual([
      { op: 'append', pos: '2#VK', lines: ['after'] },
      { op: 'prepend', pos: '4#MB', lines: ['before'] },
    ]);
  });

  it('rejects unknown operation', () => {
    const input: RawHashlineEdit[] = [{ op: 'badop', lines: 'text' }];

    expect(() => normalizeHashlineEdits(input)).toThrow(/unknown operation/i);
  });
});
