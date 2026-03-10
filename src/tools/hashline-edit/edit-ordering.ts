import type { HashlineEdit } from './types';
import { type LineRef, parseLineRef } from './validation';

/**
 * Get the effective line number for sorting an edit operation.
 * Returns -Infinity for unanchored operations (they go first/last).
 */
export function getEditLineNumber(edit: HashlineEdit): number {
  switch (edit.op) {
    case 'replace': {
      const anchor = edit.end ?? edit.pos;
      if (!anchor) return -Infinity;
      return parseLineRef(anchor).line;
    }
    case 'append':
    case 'prepend': {
      if (!edit.pos) return -Infinity;
      return parseLineRef(edit.pos).line;
    }
  }
}

/**
 * Collect all LINE#HASH references from a set of edits.
 */
export function collectLineRefs(edits: HashlineEdit[]): LineRef[] {
  const refs: LineRef[] = [];
  for (const edit of edits) {
    switch (edit.op) {
      case 'replace':
        if (edit.pos) refs.push(parseLineRef(edit.pos));
        if (edit.end) refs.push(parseLineRef(edit.end));
        break;
      case 'append':
      case 'prepend':
        if (edit.pos) refs.push(parseLineRef(edit.pos));
        break;
    }
  }
  return refs;
}

/**
 * Detect overlapping ranges in replace edits.
 * Returns an error message if overlaps found, null otherwise.
 */
export function detectOverlappingRanges(edits: HashlineEdit[]): string | null {
  const ranges: { start: number; end: number }[] = [];

  for (const edit of edits) {
    if (edit.op === 'replace' && edit.pos && edit.end) {
      const start = parseLineRef(edit.pos).line;
      const end = parseLineRef(edit.end).line;
      ranges.push({ start, end });
    }
  }

  if (ranges.length < 2) return null;

  ranges.sort((a, b) => a.start - b.start);

  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start <= ranges[i - 1].end) {
      return (
        `Overlapping ranges detected: ` +
        `[${ranges[i - 1].start}-${ranges[i - 1].end}] ` +
        `overlaps [${ranges[i].start}-${ranges[i].end}].`
      );
    }
  }

  return null;
}
