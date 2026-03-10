import { toNewLines } from './edit-text-normalization';
import type { HashlineEdit } from './types';
import { normalizeLineRef } from './validation';

/**
 * Deduplicate edits by building a canonical string key per edit.
 * Returns the unique edits and a list of deduplicated ones.
 */
export function dedupeEdits(edits: HashlineEdit[]): {
  edits: HashlineEdit[];
  deduplicatedEdits: HashlineEdit[];
} {
  const seen = new Set<string>();
  const unique: HashlineEdit[] = [];
  const dupes: HashlineEdit[] = [];

  for (const edit of edits) {
    const key = canonicalKey(edit);
    if (seen.has(key)) {
      dupes.push(edit);
    } else {
      seen.add(key);
      unique.push(edit);
    }
  }

  return { edits: unique, deduplicatedEdits: dupes };
}

function canonicalKey(edit: HashlineEdit): string {
  const parts: string[] = [edit.op];

  const pos = 'pos' in edit && edit.pos ? normalizeLineRef(edit.pos) : '';
  parts.push(pos);

  if (edit.op === 'replace') {
    const end = edit.end ? normalizeLineRef(edit.end) : '';
    parts.push(end);
  }

  const lines = toNewLines(edit.lines).join('\n');
  parts.push(lines);

  return parts.join('|');
}
