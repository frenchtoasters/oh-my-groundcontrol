import { HASHLINE_REF_PATTERN } from './constants';
import { computeLineHash } from './hash-computation';

export interface LineRef {
  line: number;
  hash: string;
}

/**
 * Normalize a LINE#HASH reference string.
 * Handles prefixes like >>>, +/-, whitespace around #, and trailing |content.
 */
export function normalizeLineRef(ref: string): string {
  // Strip common prefixes
  let s = ref.replace(/^(?:>>>|[+-])\s*/, '').trim();
  // Strip trailing |content
  const pipeIdx = s.indexOf('|');
  if (pipeIdx !== -1) {
    s = s.slice(0, pipeIdx);
  }
  // Normalize whitespace around #
  s = s.replace(/\s*#\s*/, '#');

  if (HASHLINE_REF_PATTERN.test(s)) return s;

  // Fallback: try to extract from within the string
  const extract = /([0-9]+#[ZPMQVRWSNKTXJBYH]{2})/.exec(ref);
  if (extract) return extract[1];

  return s;
}

/** Parse a LINE#HASH string into a LineRef. Throws on invalid format. */
export function parseLineRef(ref: string): LineRef {
  const normalized = normalizeLineRef(ref);
  const m = HASHLINE_REF_PATTERN.exec(normalized);
  if (!m) {
    // Check if the part before # contains non-digits
    const hashIdx = normalized.indexOf('#');
    if (hashIdx > 0) {
      const beforeHash = normalized.slice(0, hashIdx);
      if (/[^0-9]/.test(beforeHash)) {
        throw new Error(
          `"${beforeHash}" is not a line number. ` +
            `Use the numeric line number from Read output (e.g. "42#VK", not "LINE#VK").`,
        );
      }
    }
    throw new Error(
      `Invalid LINE#HASH reference: "${ref}"` +
        ` (normalized to "${normalized}").` +
        ` Expected format: LINE#HASH where HASH is 2 chars from [ZPMQVRWSNKTXJBYH].`,
    );
  }
  return { line: Number(m[1]), hash: m[2] };
}

/**
 * Validate that a LineRef matches the actual file content.
 * Throws HashlineMismatchError if the hash doesn't match.
 */
export function validateLineRef(lines: string[], ref: LineRef | string): void {
  const parsed = typeof ref === 'string' ? parseLineRef(ref) : ref;
  if (parsed.line < 1 || parsed.line > lines.length) {
    throw new HashlineMismatchError(
      `Line ${parsed.line} is out of range (file has ${lines.length} lines).`,
      new Map(),
    );
  }
  const content = lines[parsed.line - 1];
  const actual = computeLineHash(parsed.line, content);
  if (actual !== parsed.hash) {
    const remaps = new Map<string, string>();
    remaps.set(`${parsed.line}#${parsed.hash}`, `${parsed.line}#${actual}`);
    throw new HashlineMismatchError(
      formatMismatchMessage(lines, [{ ref: parsed, actualHash: actual }]),
      remaps,
    );
  }
}

interface MismatchInfo {
  ref: LineRef;
  actualHash: string;
}

/**
 * Batch-validate multiple LineRefs. Collects all mismatches before
 * throwing a single error. Handles parse failures gracefully by
 * trying to suggest the correct line number.
 */
export function validateLineRefs(
  lines: string[],
  refs: (LineRef | string)[],
): void {
  const mismatches: MismatchInfo[] = [];
  const parseErrors: Error[] = [];

  for (const r of refs) {
    let parsed: LineRef;
    try {
      parsed = typeof r === 'string' ? parseLineRef(r) : r;
    } catch (e) {
      // Try to extract just the hash and suggest the right line
      if (typeof r === 'string') {
        const hashMatch = /[#]([ZPMQVRWSNKTXJBYH]{2})/.exec(r);
        if (hashMatch) {
          const hash = hashMatch[1];
          const suggested = suggestLineForHash({ line: 0, hash }, lines);
          if (suggested !== undefined) {
            mismatches.push({
              ref: { line: suggested, hash },
              actualHash: computeLineHash(suggested, lines[suggested - 1]),
            });
            continue;
          }
        }
      }
      parseErrors.push(e instanceof Error ? e : new Error(String(e)));
      continue;
    }

    if (parsed.line < 1 || parsed.line > lines.length) {
      mismatches.push({ ref: parsed, actualHash: '??' });
      continue;
    }
    const content = lines[parsed.line - 1];
    const actual = computeLineHash(parsed.line, content);
    if (actual !== parsed.hash) {
      mismatches.push({ ref: parsed, actualHash: actual });
    }
  }

  if (parseErrors.length > 0 && mismatches.length === 0) {
    throw parseErrors[0];
  }

  if (mismatches.length > 0) {
    const remaps = new Map<string, string>();
    for (const m of mismatches) {
      remaps.set(
        `${m.ref.line}#${m.ref.hash}`,
        `${m.ref.line}#${m.actualHash}`,
      );
    }
    throw new HashlineMismatchError(
      formatMismatchMessage(lines, mismatches),
      remaps,
    );
  }
}

/**
 * Scan all lines to find where a given hash actually appears.
 * Returns the line number, or undefined if not found.
 */
export function suggestLineForHash(
  ref: LineRef,
  lines: string[],
): number | undefined {
  for (let i = 0; i < lines.length; i++) {
    const hash = computeLineHash(i + 1, lines[i]);
    if (hash === ref.hash) return i + 1;
  }
  return undefined;
}

function formatMismatchMessage(
  lines: string[],
  mismatches: MismatchInfo[],
): string {
  const parts: string[] = [
    `${mismatches.length} line(s) have changed since last read.` +
      ' Use updated LINE#ID references below (>>> marks changed lines).\n',
  ];

  for (const m of mismatches) {
    // Show ±2 lines of context
    const start = Math.max(0, m.ref.line - 3);
    const end = Math.min(lines.length, m.ref.line + 2);

    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const hash = computeLineHash(lineNum, lines[i]);
      const prefix = lineNum === m.ref.line ? '>>>' : '   ';
      parts.push(`${prefix} ${lineNum}#${hash}|${lines[i]}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Error thrown when hash validation fails, containing
 * remapping information for recovery.
 */
export class HashlineMismatchError extends Error {
  readonly remaps: Map<string, string>;

  constructor(message: string, remaps: Map<string, string>) {
    super(message);
    this.name = 'HashlineMismatchError';
    this.remaps = remaps;
  }
}
