export interface FileTextEnvelope {
  content: string;
  hadBom: boolean;
  lineEnding: '\n' | '\r\n';
}

/**
 * Canonicalize file text: strip BOM, normalize line endings to LF.
 * Returns the cleaned content plus an envelope for restoring later.
 */
export function canonicalizeFileText(raw: string): FileTextEnvelope {
  let content = raw;
  const hadBom = content.charCodeAt(0) === 0xfeff;
  if (hadBom) content = content.slice(1);

  // Detect line ending based on which appears first
  const crlfIdx = content.indexOf('\r\n');
  const lfIdx = content.indexOf('\n');
  const lineEnding: '\n' | '\r\n' =
    crlfIdx !== -1 && (lfIdx === -1 || crlfIdx <= lfIdx) ? '\r\n' : '\n';
  content = content.replace(/\r\n/g, '\n');

  return { content, hadBom, lineEnding };
}

/**
 * Restore original file text format from envelope (BOM, line endings).
 */
export function restoreFileText(
  content: string,
  envelope: FileTextEnvelope,
): string {
  let result = content;
  if (envelope.lineEnding === '\r\n') {
    result = result.replace(/\n/g, '\r\n');
  }
  if (envelope.hadBom) {
    result = `\uFEFF${result}`;
  }
  return result;
}
