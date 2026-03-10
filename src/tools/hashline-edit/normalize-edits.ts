import type {
  AppendEdit,
  HashlineEdit,
  PrependEdit,
  ReplaceEdit,
} from './types';

export interface RawHashlineEdit {
  op?: string;
  pos?: string;
  end?: string;
  lines?: string | string[] | null;
}

function normalizeAnchor(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function requireLines(
  value: string | string[] | null | undefined,
): string | string[] {
  if (value == null) return [];
  return value;
}

/**
 * Normalize raw tool input into typed HashlineEdit objects.
 * Validates required fields per operation type.
 */
export function normalizeHashlineEdits(
  rawEdits: RawHashlineEdit[],
): HashlineEdit[] {
  return rawEdits.map((raw, i) => {
    const op = raw.op?.toLowerCase().trim();

    switch (op) {
      case 'replace': {
        const pos = normalizeAnchor(raw.pos);
        const end = normalizeAnchor(raw.end);
        if (!pos && !end) {
          throw new Error(
            `Edit [${i}]: 'replace' requires at least one anchor (pos or end).`,
          );
        }
        return {
          op: 'replace',
          pos,
          end,
          lines: requireLines(raw.lines),
        } satisfies ReplaceEdit;
      }

      case 'append': {
        return {
          op: 'append',
          pos: normalizeAnchor(raw.pos),
          lines: requireLines(raw.lines),
        } satisfies AppendEdit;
      }

      case 'prepend': {
        return {
          op: 'prepend',
          pos: normalizeAnchor(raw.pos),
          lines: requireLines(raw.lines),
        } satisfies PrependEdit;
      }

      default:
        throw new Error(
          `Edit [${i}]: unknown operation "${raw.op}".` +
            ` Valid operations: replace, append, prepend.`,
        );
    }
  });
}
