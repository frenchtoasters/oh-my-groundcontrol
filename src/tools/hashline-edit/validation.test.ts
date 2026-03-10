import { describe, expect, it } from 'bun:test';
import { computeLineHash } from './hash-computation';
import { parseLineRef, validateLineRef, validateLineRefs } from './validation';

describe('parseLineRef', () => {
  it('parses valid LINE#ID reference', () => {
    const result = parseLineRef('42#VK');

    expect(result).toEqual({ line: 42, hash: 'VK' });
  });

  it('throws on invalid format', () => {
    expect(() => parseLineRef('42:VK')).toThrow();
  });

  it('gives specific hint when literal text is used instead of line number', () => {
    expect(() => parseLineRef('LINE#HK')).toThrow(/not a line number/i);
  });

  it('gives specific hint for other non-numeric prefixes like POS#VK', () => {
    expect(() => parseLineRef('POS#VK')).toThrow(/not a line number/i);
  });

  it('extracts valid line number from mixed prefix like LINE42#VK', () => {
    const result = parseLineRef('LINE42#VK');
    expect(result.line).toBe(42);
    expect(result.hash).toBe('VK');
  });

  it('gives specific hint when hyphenated prefix is used', () => {
    expect(() => parseLineRef('line-ref#VK')).toThrow(/not a line number/i);
  });

  it('gives specific hint when prefix contains a period', () => {
    expect(() => parseLineRef('line.ref#VK')).toThrow(/not a line number/i);
  });

  it('accepts refs copied with markers and trailing content', () => {
    const result = parseLineRef('>>> 42#VK|const value = 1');

    expect(result).toEqual({ line: 42, hash: 'VK' });
  });

  it('accepts refs copied with >>> marker only', () => {
    const result = parseLineRef('>>> 42#VK');

    expect(result).toEqual({ line: 42, hash: 'VK' });
  });

  it('accepts refs with spaces around hash separator', () => {
    const result = parseLineRef('42 # VK');

    expect(result).toEqual({ line: 42, hash: 'VK' });
  });
});

describe('validateLineRef', () => {
  it('accepts matching reference', () => {
    const lines = ['function hello() {', '  return 42', '}'];
    const hash = computeLineHash(1, lines[0]);

    expect(() => validateLineRef(lines, `1#${hash}`)).not.toThrow();
  });

  it('throws on mismatch and includes current hash', () => {
    const lines = ['function hello() {'];

    expect(() => validateLineRef(lines, '1#ZZ')).toThrow(
      />>>\s+1#[ZPMQVRWSNKTXJBYH]{2}\|/,
    );
  });

  it('shows >>> mismatch context in batched validation', () => {
    const lines = ['one', 'two', 'three', 'four'];

    expect(() => validateLineRefs(lines, ['2#ZZ'])).toThrow(
      />>>\s+2#[ZPMQVRWSNKTXJBYH]{2}\|two/,
    );
  });

  it('suggests correct line number when hash matches a file line', () => {
    const lines = ['function hello() {', '  return 42', '}'];
    const hash = computeLineHash(1, lines[0]);

    expect(() => validateLineRefs(lines, [`LINE#${hash}`])).toThrow(
      new RegExp(`1#${hash}`),
    );
  });
});
