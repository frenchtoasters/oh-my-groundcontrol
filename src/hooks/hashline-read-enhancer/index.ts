import { existsSync, readFileSync } from 'node:fs';
import { formatHashLine } from '../../tools/hashline-edit/hash-computation';

interface HashlineEditConfig {
  enabled?: boolean;
}

interface ToolExecuteAfterInput {
  tool: string;
  sessionID?: string;
  callID?: string;
}

interface ToolExecuteAfterOutput {
  title: string;
  output: unknown;
  metadata: unknown;
}

/**
 * Read tool line format: "N: content" or "N| content"
 * where N is a line number.
 */
const READ_LINE_PATTERN = /^(\d+)([:|])\s?(.*)/;

/**
 * Matches <content> or <file ...> XML tag blocks in Read output.
 */
const CONTENT_BLOCK_START = /^<(?:content|file\b)/;
const CONTENT_BLOCK_END = /^<\/(?:content|file)>/;

const TRUNCATED_SUFFIX = '... (line truncated to 2000 chars)';

function shouldProcess(config?: HashlineEditConfig): boolean {
  // Enabled by default - only disabled if explicitly set to false
  return config?.enabled !== false;
}

function transformReadLine(rawLine: string): string {
  const m = READ_LINE_PATTERN.exec(rawLine);
  if (!m) return rawLine;

  const lineNum = Number(m[1]);
  const content = m[3];

  // Skip truncated lines - hash would be inaccurate
  if (content.endsWith(TRUNCATED_SUFFIX)) {
    return rawLine;
  }

  return formatHashLine(lineNum, content);
}

function transformReadOutput(output: string): string {
  const lines = output.split('\n');
  const result: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (CONTENT_BLOCK_START.test(line)) {
      inBlock = true;
      result.push(line);
      continue;
    }
    if (CONTENT_BLOCK_END.test(line)) {
      inBlock = false;
      result.push(line);
      continue;
    }

    if (inBlock || READ_LINE_PATTERN.test(line)) {
      result.push(transformReadLine(line));
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Create the hashline read enhancer hook.
 * Intercepts Read tool output to inject LINE#HASH| prefixes.
 * Also intercepts Write tool output to provide hashlined file content.
 */
export function createHashlineReadEnhancerHook(config?: HashlineEditConfig) {
  return {
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput,
    ): Promise<void> => {
      if (!shouldProcess(config)) return;

      const toolName = input.tool?.toLowerCase() ?? '';

      // Transform Read tool output
      if (toolName === 'read') {
        const outputStr = String(output.output ?? '');
        if (outputStr.length > 0) {
          output.output = transformReadOutput(outputStr);
        }
        return;
      }

      // Transform Write tool output - re-read the file with hashlines
      if (toolName === 'write') {
        const outputStr = String(output.output ?? '');
        // Only intercept successful writes
        if (
          !outputStr.includes('successfully') &&
          !outputStr.includes('written')
        ) {
          return;
        }

        // Try to extract file path from output or metadata
        const meta = output.metadata as Record<string, unknown> | undefined;
        const filePath = (meta?.filePath ?? meta?.path) as string | undefined;

        if (filePath && existsSync(filePath)) {
          try {
            const content = readFileSync(filePath, 'utf-8');
            const lineCount = content.split('\n').length;
            const hashlined = content
              .split('\n')
              .map((line, i) => formatHashLine(i + 1, line))
              .join('\n');
            output.output =
              `File written successfully. ${lineCount} lines written.\n\n` +
              hashlined;
          } catch {
            // Fall through - keep original output
          }
        }
      }
    },
  };
}
