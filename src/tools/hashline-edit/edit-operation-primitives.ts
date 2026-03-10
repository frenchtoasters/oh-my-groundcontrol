import { autocorrectReplacementLines } from './autocorrect-replacement-lines';
import {
  restoreLeadingIndent,
  stripInsertAnchorEcho,
  stripInsertBeforeEcho,
  stripRangeBoundaryEcho,
  toNewLines,
} from './edit-text-normalization';
import { parseLineRef, validateLineRef } from './validation';

interface EditOptions {
  skipValidation?: boolean;
}

/** Replace a single line at anchor position. */
export function applySetLine(
  lines: string[],
  anchor: string,
  newText: string | string[],
  opts?: EditOptions,
): string[] {
  const ref = parseLineRef(anchor);
  if (!opts?.skipValidation) validateLineRef(lines, ref);

  let replacement = toNewLines(newText);
  replacement = autocorrectReplacementLines([lines[ref.line - 1]], replacement);

  // Restore indentation from original line
  if (replacement.length > 0) {
    replacement[0] = restoreLeadingIndent(lines[ref.line - 1], replacement[0]);
  }

  lines.splice(ref.line - 1, 1, ...replacement);
  return lines;
}

/** Replace a range of lines between start and end anchors (inclusive). */
export function applyReplaceLines(
  lines: string[],
  startAnchor: string,
  endAnchor: string,
  newText: string | string[],
  opts?: EditOptions,
): string[] {
  const startRef = parseLineRef(startAnchor);
  const endRef = parseLineRef(endAnchor);
  if (!opts?.skipValidation) {
    validateLineRef(lines, startRef);
    validateLineRef(lines, endRef);
  }

  const start = startRef.line - 1;
  const end = endRef.line - 1;
  const count = end - start + 1;

  let replacement = toNewLines(newText);

  // Strip boundary echoes
  replacement = stripRangeBoundaryEcho(
    lines,
    startRef.line,
    endRef.line,
    replacement,
  );

  replacement = autocorrectReplacementLines(
    lines.slice(start, end + 1),
    replacement,
  );

  // Restore indentation from first original line
  if (replacement.length > 0) {
    replacement[0] = restoreLeadingIndent(lines[start], replacement[0]);
  }

  lines.splice(start, count, ...replacement);
  return lines;
}

/** Insert lines after the anchor line. */
export function applyInsertAfter(
  lines: string[],
  anchor: string,
  text: string | string[],
  opts?: EditOptions,
): string[] {
  const ref = parseLineRef(anchor);
  if (!opts?.skipValidation) validateLineRef(lines, ref);

  let newLines = toNewLines(text);
  newLines = stripInsertAnchorEcho(lines[ref.line - 1], newLines);

  if (newLines.length === 0) {
    throw new Error(
      `Insert after ${anchor}: content must be non-empty (after stripping anchor echo).`,
    );
  }

  lines.splice(ref.line, 0, ...newLines);
  return lines;
}

/** Insert lines before the anchor line. */
export function applyInsertBefore(
  lines: string[],
  anchor: string,
  text: string | string[],
  opts?: EditOptions,
): string[] {
  const ref = parseLineRef(anchor);
  if (!opts?.skipValidation) validateLineRef(lines, ref);

  let newLines = toNewLines(text);
  newLines = stripInsertBeforeEcho(lines[ref.line - 1], newLines);

  if (newLines.length === 0) {
    throw new Error(
      `Insert before ${anchor}: content must be non-empty (after stripping anchor echo).`,
    );
  }

  lines.splice(ref.line - 1, 0, ...newLines);
  return lines;
}

/** Append lines at the end of the file. */
export function applyAppend(
  lines: string[],
  text: string | string[],
): string[] {
  const newLines = toNewLines(text);
  // Handle empty file edge case
  if (lines.length === 1 && lines[0] === '') {
    lines.splice(0, 1, ...newLines);
  } else {
    lines.push(...newLines);
  }
  return lines;
}

/** Prepend lines at the beginning of the file. */
export function applyPrepend(
  lines: string[],
  text: string | string[],
): string[] {
  const newLines = toNewLines(text);
  // Handle empty file edge case
  if (lines.length === 1 && lines[0] === '') {
    lines.splice(0, 1, ...newLines);
  } else {
    lines.unshift(...newLines);
  }
  return lines;
}
