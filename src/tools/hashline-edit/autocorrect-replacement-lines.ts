/**
 * Autocorrection pipeline for LLM replacement text.
 * Fixes common LLM mistakes: merged lines, wrapped lines, lost indentation.
 */

/**
 * If the LLM merged N original lines into a single replacement line,
 * try to expand back to the original structure.
 */
function maybeExpandSingleLineMerge(
  originalLines: string[],
  replacementLines: string[],
): string[] {
  if (replacementLines.length !== 1 || originalLines.length <= 1) {
    return replacementLines;
  }

  const merged = replacementLines[0];

  // Strategy 1: Try to find original trimmed substrings in the merged text
  const expanded: string[] = [];
  let remaining = merged;
  let foundCount = 0;

  for (const orig of originalLines) {
    const trimmed = orig.trim();
    if (trimmed.length === 0) continue;

    const idx = remaining.indexOf(trimmed);
    if (idx !== -1) {
      foundCount++;
      if (idx > 0) {
        const before = remaining.slice(0, idx).trim();
        if (before.length > 0) expanded.push(before);
      }
      expanded.push(orig); // Use original (preserves indent)
      remaining = remaining.slice(idx + trimmed.length).trim();
    }
  }

  if (remaining.length > 0) {
    expanded.push(remaining);
  }

  // Only use expansion if it recovered a reasonable number of lines
  if (expanded.length >= originalLines.length * 0.5 && foundCount > 0) {
    return expanded;
  }

  // Strategy 2: Try semicolon-based splitting when originals end with ;
  const allEndWithSemicolon = originalLines.every(
    (l) => l.trim().endsWith(';') || l.trim().length === 0,
  );
  if (allEndWithSemicolon && merged.includes(';')) {
    const parts = merged.split(/;\s*/).filter((p) => p.length > 0);
    if (parts.length === originalLines.length) {
      return parts.map((p, i) => {
        const origIndent = originalLines[i].match(/^(\s*)/)?.[1] ?? '';
        return origIndent + p.trim() + ';';
      });
    }
  }

  return replacementLines;
}

/**
 * If 2-10 consecutive replacement lines whitespace-canonically match
 * a single original line, replace the span with the original.
 */
function restoreOldWrappedLines(
  originalLines: string[],
  replacementLines: string[],
): string[] {
  if (originalLines.length === 0 || replacementLines.length === 0) {
    return replacementLines;
  }

  // Build a map of canonical form → original line (only unique entries)
  const canonMap = new Map<string, string>();
  const dupeKeys = new Set<string>();
  for (const line of originalLines) {
    const key = normalizeTokens(line);
    if (canonMap.has(key)) {
      dupeKeys.add(key);
    } else {
      canonMap.set(key, line);
    }
  }
  for (const key of dupeKeys) {
    canonMap.delete(key);
  }

  const result = [...replacementLines];
  // Try windows of size 2..10
  for (let windowSize = 10; windowSize >= 2; windowSize--) {
    for (let i = 0; i <= result.length - windowSize; i++) {
      // Skip windows that start or end with blank lines
      const windowSlice = result.slice(i, i + windowSize);
      if (
        windowSlice[0].trim().length === 0 ||
        windowSlice[windowSlice.length - 1].trim().length === 0
      ) {
        continue;
      }
      const combined = windowSlice.map((l) => l.trim()).join(' ');
      const key = normalizeTokens(combined);
      const original = canonMap.get(key);
      if (original) {
        result.splice(i, windowSize, original);
      }
    }
  }

  return result;
}

/**
 * When line counts match, restore original indentation to the FIRST
 * replacement line if it lost its indentation and has different content
 * from the original (genuine edit). Only the first line is restored
 * to preserve the user's intent for subsequent lines.
 */
function restoreIndentForPairedReplacement(
  originalLines: string[],
  replacementLines: string[],
): string[] {
  if (
    originalLines.length !== replacementLines.length ||
    replacementLines.length === 0
  ) {
    return replacementLines;
  }

  const result = [...replacementLines];
  const orig = originalLines[0];
  const repl = result[0];
  const origIndent = orig.match(/^(\s*)/)?.[1] ?? '';
  const replContent = repl.trimStart();
  const origContent = orig.trimStart();

  // Only restore first line if it lost indentation and content changed
  if (
    origIndent.length > 0 &&
    repl === replContent &&
    replContent.length > 0 &&
    replContent !== origContent
  ) {
    result[0] = origIndent + replContent;
  }

  return result;
}

/**
 * Apply the full autocorrection pipeline.
 */
export function autocorrectReplacementLines(
  originalLines: string[],
  replacementLines: string[],
): string[] {
  let result = maybeExpandSingleLineMerge(originalLines, replacementLines);
  result = restoreOldWrappedLines(originalLines, result);
  result = restoreIndentForPairedReplacement(originalLines, result);
  return result;
}

/**
 * Normalize a string for canonical comparison.
 * Collapses all whitespace to make e.g. "a + b" == "a+b".
 */
function normalizeTokens(s: string): string {
  return s.trim().replace(/\s+/g, '').toLowerCase();
}
