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

const EDIT_ERROR_PATTERNS = [
  'oldString and newString must be different',
  'oldString not found',
  'Found multiple matches for oldString',
  'oldString found multiple times',
];

const EDIT_ERROR_REMINDER = `

---
**Edit failed.** To recover:
1. **Re-read** the file immediately to see its current content
2. **Verify** the exact text you want to change exists in the file
3. **Apologize** briefly for the error
4. **Retry** with the corrected oldString/newString

Common causes:
- The file was modified since you last read it
- Whitespace or indentation doesn't match exactly
- The oldString spans multiple lines incorrectly
- You're matching a string that appears multiple times (add more context)
`;

/**
 * Create the edit error recovery hook.
 * Appends recovery instructions when OpenCode's Edit tool fails.
 */
export function createEditErrorRecoveryHook() {
  return {
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput,
    ): Promise<void> => {
      // Only intercept Edit tool
      const toolName = input.tool?.toLowerCase() ?? '';
      if (toolName !== 'edit') return;

      const outputStr = String(output.output ?? '');

      // Check if output contains any error pattern
      const hasError = EDIT_ERROR_PATTERNS.some((pattern) =>
        outputStr.includes(pattern),
      );

      if (hasError) {
        output.output = outputStr + EDIT_ERROR_REMINDER;
      }
    },
  };
}
