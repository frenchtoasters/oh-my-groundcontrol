import { existsSync, readFileSync } from 'node:fs';
import { storeToolMetadata } from '../../features/tool-metadata-store';
import {
  countLineDiffs,
  generateUnifiedDiff,
  toHashlineContent,
} from './diff-utils';
import { applyHashlineEditsWithReport } from './edit-operations';
import {
  canonicalizeFileText,
  restoreFileText,
} from './file-text-canonicalization';
import type { RawHashlineEdit } from './normalize-edits';
import { normalizeHashlineEdits } from './normalize-edits';
import { HashlineMismatchError } from './validation';

interface ExecuteArgs {
  filePath: string;
  delete?: boolean;
  rename?: string;
  edits?: RawHashlineEdit[];
}

interface ExecuteContext {
  sessionID?: string;
  callID?: string;
  metadata?: (data: Record<string, unknown>) => void;
}

/**
 * Main entry point for hashline edit execution.
 */
export async function executeHashlineEditTool(
  args: ExecuteArgs,
  context: ExecuteContext,
): Promise<string> {
  const { filePath } = args;

  try {
    // Delete mode
    if (args.delete) {
      if (args.rename) {
        return 'Error: delete and rename cannot be used together.';
      }
      if (args.edits && args.edits.length > 0) {
        return 'Error: delete mode requires edits to be an empty array.';
      }
      if (!existsSync(filePath)) {
        return `Error: file not found: ${filePath}`;
      }
      const file = Bun.file(filePath);
      await file.delete();
      return `Successfully deleted ${filePath}`;
    }

    // Require edits
    if (!args.edits || args.edits.length === 0) {
      return 'Error: edits array is required and cannot be empty.';
    }

    // Normalize edits
    const edits = normalizeHashlineEdits(args.edits);

    // Check if file exists (missing OK for unanchored append/prepend)
    const fileExists = existsSync(filePath);
    const hasAnchors = edits.some((e) => 'pos' in e && e.pos);

    if (!fileExists && hasAnchors) {
      return `File not found: ${filePath}. Only unanchored append/prepend can create files.`;
    }

    // Read and canonicalize
    const raw = fileExists ? readFileSync(filePath, 'utf-8') : '';
    const envelope = canonicalizeFileText(raw);
    const oldContent = envelope.content;

    // Apply edits
    const report = applyHashlineEditsWithReport(oldContent, edits);

    // Check for no-op
    if (report.content === oldContent) {
      return 'Error: edits produced no changes (content is identical to original).';
    }

    // Restore file format and write
    const finalContent = restoreFileText(report.content, envelope);

    if (args.rename) {
      // Write to new path, delete old
      await Bun.write(args.rename, finalContent);
      if (fileExists) {
        await Bun.file(filePath).delete();
      }
    } else {
      await Bun.write(filePath, finalContent);
    }

    // Generate diff for metadata
    const outputPath = args.rename ?? filePath;
    const diff = generateUnifiedDiff(oldContent, report.content, outputPath);
    const { additions, deletions } = countLineDiffs(oldContent, report.content);
    const newLineCount = report.content.split('\n').length;

    // Build result message
    const noopNote =
      report.noopEdits.length > 0
        ? ` (${report.noopEdits.length} no-op edit(s) skipped)`
        : '';
    const dedupeNote =
      report.deduplicatedEdits > 0
        ? ` (${report.deduplicatedEdits} duplicate(s) removed)`
        : '';

    const resultMsg = args.rename
      ? `Moved ${filePath} to ${args.rename}${noopNote}${dedupeNote}`
      : `Updated ${filePath}${noopNote}${dedupeNote}`;

    // Store metadata for the tool.execute.after hook to restore
    const metadata: Record<string, unknown> = {
      diff,
      hashlineDiff: toHashlineContent(report.content),
      additions,
      deletions,
      lineCount: newLineCount,
      filePath: outputPath,
    };

    if (context.sessionID && context.callID) {
      storeToolMetadata(context.sessionID, context.callID, {
        title: resultMsg,
        metadata,
      });
    }

    if (context.metadata) {
      context.metadata(metadata);
    }

    return resultMsg;
  } catch (error) {
    if (error instanceof HashlineMismatchError) {
      return (
        `Error: ${error.message}\n\n` +
        'Tip: Re-read the file to get updated LINE#ID references, then retry.'
      );
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
