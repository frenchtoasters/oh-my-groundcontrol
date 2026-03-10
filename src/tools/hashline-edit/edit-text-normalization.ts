import { HASHLINE_OUTPUT_PATTERN } from './constants';

/**
 * Detect and strip hashline prefixes (N#XX|...) or diff + markers
 * from an array of lines if ≥50% of non-empty lines have them.
 */
export function stripLinePrefixes(lines: string[]): string[] {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return lines;

  // Check for hashline prefixes
  const hashPrefixed = nonEmpty.filter((l) => HASHLINE_OUTPUT_PATTERN.test(l));
  if (hashPrefixed.length / nonEmpty.length >= 0.5) {
    return lines.map((l) => {
      const m = HASHLINE_OUTPUT_PATTERN.exec(l);
      return m ? m[3] : l;
    });
  }

  // Check for diff + prefixes
  const plusPrefixed = nonEmpty.filter((l) => l.startsWith('+'));
  if (plusPrefixed.length / nonEmpty.length >= 0.5) {
    return lines.map((l) => (l.startsWith('+') ? l.slice(1) : l));
  }

  return lines;
}

/**
 * Convert string | string[] input to a string[], applying prefix stripping.
 */
export function toNewLines(input: string | string[]): string[] {
  const raw = typeof input === 'string' ? input.split('\n') : input;
  return stripLinePrefixes(raw);
}

/**
 * Restore the leading indentation from a template line onto a target line.
 * Only restores if the trimmed content is DIFFERENT from the template's
 * content (meaning a genuine edit was made but indentation was lost).
 * If the trimmed content is the same, the user intentionally removed
 * indentation, so we preserve their intent.
 */
export function restoreLeadingIndent(
  templateLine: string,
  line: string,
): string {
  const templateIndent = templateLine.match(/^(\s*)/)?.[1] ?? '';
  const lineContent = line.trimStart();
  const templateContent = templateLine.trimStart();
  // Only restore if: line has no indentation, template had indentation,
  // AND the trimmed content is DIFFERENT (genuine edit that lost indent)
  if (
    templateIndent.length > 0 &&
    line === lineContent &&
    lineContent.length > 0 &&
    lineContent !== templateContent
  ) {
    return templateIndent + lineContent;
  }
  return line;
}

/**
 * Strip the anchor line echo from the beginning of inserted lines
 * (for insert-after operations).
 */
export function stripInsertAnchorEcho(
  anchorLine: string,
  newLines: string[],
): string[] {
  if (newLines.length > 0 && newLines[0].trim() === anchorLine.trim()) {
    return newLines.slice(1);
  }
  return newLines;
}

/**
 * Strip the anchor line echo from the end of inserted lines
 * (for insert-before operations).
 */
export function stripInsertBeforeEcho(
  anchorLine: string,
  newLines: string[],
): string[] {
  if (
    newLines.length > 0 &&
    newLines[newLines.length - 1].trim() === anchorLine.trim()
  ) {
    return newLines.slice(0, -1);
  }
  return newLines;
}

/**
 * Strip boundary echoes from both ends (for insert operations between lines).
 */
export function stripInsertBoundaryEcho(
  afterLine: string,
  beforeLine: string,
  newLines: string[],
): string[] {
  let result = stripInsertAnchorEcho(afterLine, newLines);
  result = stripInsertBeforeEcho(beforeLine, result);
  return result;
}

/**
 * Strip surrounding context lines that leaked into replacement text
 * (for range replace operations). Only strips non-blank echoes.
 */
export function stripRangeBoundaryEcho(
  lines: string[],
  startLine: number,
  endLine: number,
  newLines: string[],
): string[] {
  let result = [...newLines];

  // Strip echo of line before start (only for non-blank lines)
  if (startLine > 1 && result.length > 0) {
    const beforeLine = lines[startLine - 2];
    if (
      beforeLine.trim().length > 0 &&
      result[0].trim() === beforeLine.trim()
    ) {
      result = result.slice(1);
    }
  }

  // Strip echo of line after end (only for non-blank lines)
  if (endLine < lines.length && result.length > 0) {
    const afterLine = lines[endLine];
    if (
      afterLine.trim().length > 0 &&
      result[result.length - 1].trim() === afterLine.trim()
    ) {
      result = result.slice(0, -1);
    }
  }

  return result;
}
