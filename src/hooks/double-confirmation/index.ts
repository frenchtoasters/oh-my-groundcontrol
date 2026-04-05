import type { DoubleConfirmationConfig } from '../../config/schema';

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

const CONFIRMATION_TOOLS = new Set(['background_task', 'task']);

const CONFIRMATION_NUDGE = `

---
[Verification Required] Before accepting this result, confirm:
- Does the result fully address the original request?
- Are there any loose ends or incomplete aspects?
- Would you request any changes if reviewing this?
If satisfied, proceed. If not, re-examine the result.`;

/**
 * Creates the double-confirmation hook.
 *
 * Meta-Harness principle: prevent premature task completion by
 * appending a verification nudge when background/delegated tasks
 * return results. Only fires once per unique call (tracked by callID).
 *
 * Ships disabled by default — enable via config.double_confirmation.enabled.
 */
export function createDoubleConfirmationHook(
  config?: DoubleConfirmationConfig,
) {
  const enabled = config?.enabled ?? false;
  const confirmedCalls = new Set<string>();

  return {
    'tool.execute.after': async (
      input: ToolExecuteAfterInput,
      output: ToolExecuteAfterOutput,
    ): Promise<void> => {
      if (!enabled) return;

      // Only for background_task and task tools
      if (!CONFIRMATION_TOOLS.has(input.tool)) return;

      // Max 1 confirmation per call (prevent infinite loops)
      const callKey = input.callID ?? input.sessionID ?? '';
      if (!callKey || confirmedCalls.has(callKey)) return;

      confirmedCalls.add(callKey);

      const outputStr = String(output.output ?? '');
      output.output = outputStr + CONFIRMATION_NUDGE;
    },
  };
}
