import { HASHLINE_DICT } from './constants';
import { createHashlineChunkFormatter } from './hashline-chunk-formatter';

/**
 * Compute the 2-char hashline hash for a single line.
 *
 * - Significant lines (containing at least one letter or digit):
 *   stripped of leading/trailing whitespace → xxHash32 with seed 0.
 * - Blank / whitespace-only lines: hashed with seed = lineNumber
 *   so identical blank lines at different positions get distinct IDs.
 */
export function computeLineHash(lineNumber: number, content: string): string {
  const significant = /[a-zA-Z0-9]/.test(content);
  const input = significant ? content.trim() : content;
  const seed = significant ? 0 : lineNumber;
  const h = Bun.hash.xxHash32(input, seed);
  return HASHLINE_DICT[Number(h) & 0xff];
}

/** Format a single line as `LINE#HASH|content`. */
export function formatHashLine(lineNumber: number, content: string): string {
  const hash = computeLineHash(lineNumber, content);
  return `${lineNumber}#${hash}|${content}`;
}

/** Format an entire file content string into hashline-prefixed lines. */
export function formatHashLines(content: string): string {
  const lines = content.split('\n');
  return lines.map((line, i) => formatHashLine(i + 1, line)).join('\n');
}

export interface StreamHashLinesOptions {
  startLine?: number;
  maxChunkLines?: number;
  maxChunkBytes?: number;
}

/**
 * Async generator that streams hashline-formatted chunks from a
 * ReadableStream or AsyncIterable of UTF-8 bytes.
 */
export async function* streamHashLinesFromUtf8(
  source: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
  options: StreamHashLinesOptions = {},
): AsyncGenerator<string> {
  const {
    startLine = 1,
    maxChunkLines = 200,
    maxChunkBytes = 64 * 1024,
  } = options;

  const formatter = createHashlineChunkFormatter({
    maxChunkLines,
    maxChunkBytes,
  });

  let lineNum = startLine;
  let buffer = '';

  const iter =
    Symbol.asyncIterator in source
      ? source
      : (source as ReadableStream<Uint8Array>);

  for await (const chunk of iter as AsyncIterable<Uint8Array>) {
    buffer += new TextDecoder().decode(chunk, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const formatted = formatHashLine(lineNum, part);
      lineNum++;
      const chunks = formatter.push(formatted);
      for (const c of chunks) yield c;
    }
  }

  // Handle remaining buffer (always emit at least one line for non-empty content)
  if (buffer.length > 0) {
    const formatted = formatHashLine(lineNum, buffer);
    const chunks = formatter.push(formatted);
    for (const c of chunks) yield c;
  } else if (lineNum === startLine) {
    // Empty input: still emit one empty line to match formatHashLines('')
    const formatted = formatHashLine(lineNum, '');
    const chunks = formatter.push(formatted);
    for (const c of chunks) yield c;
  }

  const remaining = formatter.flush();
  if (remaining) yield remaining;
}

/**
 * Async generator that streams hashline-formatted chunks from
 * sync or async line iterables.
 */
export async function* streamHashLinesFromLines(
  lines: Iterable<string> | AsyncIterable<string>,
  options: StreamHashLinesOptions = {},
): AsyncGenerator<string> {
  const {
    startLine = 1,
    maxChunkLines = 200,
    maxChunkBytes = 64 * 1024,
  } = options;

  const formatter = createHashlineChunkFormatter({
    maxChunkLines,
    maxChunkBytes,
  });

  let lineNum = startLine;
  let hasLines = false;

  for await (const line of lines as AsyncIterable<string>) {
    hasLines = true;
    const formatted = formatHashLine(lineNum, line);
    lineNum++;
    const chunks = formatter.push(formatted);
    for (const c of chunks) yield c;
  }

  // Empty input: still emit one empty line to match formatHashLines('')
  if (!hasLines) {
    const formatted = formatHashLine(startLine, '');
    const chunks = formatter.push(formatted);
    for (const c of chunks) yield c;
  }

  const remaining = formatter.flush();
  if (remaining) yield remaining;
}
