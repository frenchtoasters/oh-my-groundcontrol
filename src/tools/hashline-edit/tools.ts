import { type ToolDefinition, tool } from '@opencode-ai/plugin/tool';
import { executeHashlineEditTool } from './hashline-edit-executor';
import { HASHLINE_EDIT_DESCRIPTION } from './tool-description';

/**
 * Factory that creates the hashline_edit tool definition.
 */
export function createHashlineEditTool(): ToolDefinition {
  return tool({
    description: HASHLINE_EDIT_DESCRIPTION,
    args: {
      filePath: tool.schema
        .string()
        .describe('Absolute path to the file to edit'),
      delete: tool.schema
        .boolean()
        .optional()
        .describe('Delete the file instead of editing'),
      rename: tool.schema
        .string()
        .optional()
        .describe(
          'New path to rename/move the file to (edits applied before rename)',
        ),
      edits: tool.schema
        .array(
          tool.schema.object({
            op: tool.schema
              .union([
                tool.schema.literal('replace'),
                tool.schema.literal('append'),
                tool.schema.literal('prepend'),
              ])
              .describe('Edit operation type'),
            pos: tool.schema
              .string()
              .optional()
              .describe('LINE#ID anchor (start position)'),
            end: tool.schema
              .string()
              .optional()
              .describe('LINE#ID anchor (end position, for range replace)'),
            lines: tool.schema
              .union([
                tool.schema.string(),
                tool.schema.array(tool.schema.string()),
                tool.schema.null(),
              ])
              .optional()
              .describe(
                'Replacement/insertion content (string, string[], or null to delete)',
              ),
          }),
        )
        .optional()
        .describe('Array of edit operations to apply'),
    },
    execute: async (args, context) => {
      return executeHashlineEditTool(args, {
        sessionID: (context as Record<string, unknown>).sessionID as
          | string
          | undefined,
        callID: (context as Record<string, unknown>).callID as
          | string
          | undefined,
        metadata: (context as Record<string, unknown>).metadata as
          | ((data: Record<string, unknown>) => void)
          | undefined,
      });
    },
  });
}
