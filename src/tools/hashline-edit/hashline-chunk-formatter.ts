interface ChunkFormatterOptions {
  maxChunkLines: number;
  maxChunkBytes: number;
}

interface ChunkFormatter {
  push(line: string): string[];
  flush(): string | undefined;
}

/**
 * Buffered chunk formatter – accumulates formatted lines and yields
 * chunks when either the line count or byte budget is exceeded.
 */
export function createHashlineChunkFormatter(
  options: ChunkFormatterOptions,
): ChunkFormatter {
  const { maxChunkLines, maxChunkBytes } = options;
  let lines: string[] = [];
  let bytes = 0;

  function drain(): string {
    const chunk = lines.join('\n');
    lines = [];
    bytes = 0;
    return chunk;
  }

  return {
    push(line: string): string[] {
      const lineBytes = new TextEncoder().encode(line).length + 1; // +1 for newline
      const results: string[] = [];

      // If adding this line would exceed limits, flush first
      if (
        lines.length > 0 &&
        (lines.length >= maxChunkLines || bytes + lineBytes > maxChunkBytes)
      ) {
        results.push(drain());
      }

      lines.push(line);
      bytes += lineBytes;

      // If this single line exceeds limits, flush immediately
      if (lines.length >= maxChunkLines || bytes >= maxChunkBytes) {
        results.push(drain());
      }

      return results;
    },

    flush(): string | undefined {
      if (lines.length === 0) return undefined;
      return drain();
    },
  };
}
