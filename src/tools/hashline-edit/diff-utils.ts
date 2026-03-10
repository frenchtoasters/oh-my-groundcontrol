import { createTwoFilesPatch } from 'diff';
import { formatHashLines } from './hash-computation';

/**
 * Add LINE#HASH| prefixes to content for display.
 */
export function toHashlineContent(content: string): string {
  return formatHashLines(content);
}

/**
 * Generate a unified diff between old and new content.
 */
export function generateUnifiedDiff(
  oldContent: string,
  newContent: string,
  filePath: string,
): string {
  return createTwoFilesPatch(
    filePath,
    filePath,
    oldContent,
    newContent,
    '',
    '',
    { context: 3 },
  );
}

/**
 * Count line additions and deletions between old and new content.
 * Uses frequency-based counting (not positional diff).
 */
export function countLineDiffs(
  oldContent: string,
  newContent: string,
): { additions: number; deletions: number } {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const oldFreq = new Map<string, number>();
  for (const line of oldLines) {
    oldFreq.set(line, (oldFreq.get(line) ?? 0) + 1);
  }

  const newFreq = new Map<string, number>();
  for (const line of newLines) {
    newFreq.set(line, (newFreq.get(line) ?? 0) + 1);
  }

  let additions = 0;
  let deletions = 0;

  // Lines in new but not (or less) in old = additions
  for (const [line, count] of newFreq) {
    const oldCount = oldFreq.get(line) ?? 0;
    if (count > oldCount) additions += count - oldCount;
  }

  // Lines in old but not (or less) in new = deletions
  for (const [line, count] of oldFreq) {
    const newCount = newFreq.get(line) ?? 0;
    if (count > newCount) deletions += count - newCount;
  }

  return { additions, deletions };
}
