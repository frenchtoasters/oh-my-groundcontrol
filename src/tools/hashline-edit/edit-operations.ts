import { dedupeEdits } from './edit-deduplication';
import {
  applyAppend,
  applyInsertAfter,
  applyInsertBefore,
  applyPrepend,
  applyReplaceLines,
  applySetLine,
} from './edit-operation-primitives';
import {
  collectLineRefs,
  detectOverlappingRanges,
  getEditLineNumber,
} from './edit-ordering';
import type { HashlineEdit } from './types';
import { validateLineRefs } from './validation';

interface EditReport {
  content: string;
  noopEdits: HashlineEdit[];
  deduplicatedEdits: number;
}

/** Precedence map for stable sorting when line numbers match. */
const OP_PRECEDENCE: Record<string, number> = {
  replace: 0,
  append: 1,
  prepend: 2,
};

/**
 * Apply all hashline edits to content and return a report.
 * Edits are sorted bottom-up for correct line number handling.
 */
export function applyHashlineEditsWithReport(
  content: string,
  edits: HashlineEdit[],
): EditReport {
  // Deduplicate
  const { edits: uniqueEdits, deduplicatedEdits } = dedupeEdits(edits);

  // Sort bottom-up (highest line first), then by op precedence
  const sorted = [...uniqueEdits].sort((a, b) => {
    const lineA = getEditLineNumber(a);
    const lineB = getEditLineNumber(b);
    if (lineB !== lineA) return lineB - lineA;
    return (OP_PRECEDENCE[a.op] ?? 99) - (OP_PRECEDENCE[b.op] ?? 99);
  });

  const lines = content.split('\n');

  // Batch validate all refs
  const allRefs = collectLineRefs(sorted);
  validateLineRefs(lines, allRefs);

  // Check for overlapping ranges
  const overlap = detectOverlappingRanges(sorted);
  if (overlap) throw new Error(overlap);

  // Track no-op edits
  const noopEdits: HashlineEdit[] = [];

  // Apply each edit
  for (const edit of sorted) {
    const before = lines.join('\n');

    switch (edit.op) {
      case 'replace':
        if (edit.pos && edit.end) {
          applyReplaceLines(lines, edit.pos, edit.end, edit.lines, {
            skipValidation: true,
          });
        } else if (edit.pos) {
          applySetLine(lines, edit.pos, edit.lines, {
            skipValidation: true,
          });
        } else if (edit.end) {
          applySetLine(lines, edit.end, edit.lines, {
            skipValidation: true,
          });
        }
        break;

      case 'append':
        if (edit.pos) {
          applyInsertAfter(lines, edit.pos, edit.lines, {
            skipValidation: true,
          });
        } else {
          applyAppend(lines, edit.lines);
        }
        break;

      case 'prepend':
        if (edit.pos) {
          applyInsertBefore(lines, edit.pos, edit.lines, {
            skipValidation: true,
          });
        } else {
          applyPrepend(lines, edit.lines);
        }
        break;
    }

    // Detect no-op
    if (lines.join('\n') === before) {
      noopEdits.push(edit);
    }
  }

  return {
    content: lines.join('\n'),
    noopEdits,
    deduplicatedEdits: deduplicatedEdits.length,
  };
}

/**
 * Convenience wrapper: apply edits and return the resulting content.
 */
export function applyHashlineEdits(
  content: string,
  edits: HashlineEdit[],
): string {
  return applyHashlineEditsWithReport(content, edits).content;
}
