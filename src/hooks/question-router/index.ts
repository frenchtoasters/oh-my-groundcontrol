import type { PluginInput } from '@opencode-ai/plugin';
import type { AgentPart, Part, ToolPart, UserMessage } from '@opencode-ai/sdk';
import { log } from '../../utils/logger';

/**
 * Hook to intelligently route answers to the Question tool back to the agent that asked it.
 *
 * OpenCode defaults to routing un-agented messages to the orchestrator. If a specialized
 * agent (like contractor) asks a question and pauses, the user's answer would get routed to the
 * orchestrator. This hook detects if the last message was a Question tool call from an agent,
 * and if so, dynamically injects an AgentPart to route the answer back to them.
 */
export function createQuestionRouterHook(ctx: PluginInput) {
  return {
    'chat.message': async (
      input: { sessionID: string },
      output: { message: UserMessage; parts: Part[] },
    ): Promise<void> => {
      // 1. If user explicitly provided an @agent part, let it be.
      // This allows the user to override and explicitly talk to someone else.
      if (output.parts.some((p: Part) => p.type === 'agent')) {
        return;
      }

      try {
        // 2. Fetch the session history to see what the assistant just did
        // This is a local API call so it's extremely fast.
        const history = await ctx.client.session.messages({
          path: { id: input.sessionID },
        });

        if (!history.data || !Array.isArray(history.data)) {
          return;
        }

        // 3. Find the most recent assistant message
        // Iterate backwards for performance
        let lastAssistantMsg:
          | { info?: { role: string; agent?: string }; parts?: Part[] }
          | undefined;
        for (let i = history.data.length - 1; i >= 0; i--) {
          const msg = history.data[i] as {
            info?: { role: string; agent?: string };
            parts?: Part[];
          };
          if (msg.info?.role === 'assistant') {
            lastAssistantMsg = msg;
            break;
          }
        }

        if (!lastAssistantMsg) {
          return;
        }

        // 4. Check if the assistant just used the Question tool
        const hasQuestionTool = lastAssistantMsg.parts?.some(
          (p: Part) =>
            p.type === 'tool' &&
            (p as ToolPart).tool === 'default_api:question',
        );

        if (hasQuestionTool) {
          const prevAgent = lastAssistantMsg.info?.agent;

          // If the question came from a specific agent (like contractor), route back to them
          if (prevAgent && prevAgent !== 'orchestrator') {
            log(
              `[question-router] Re-routing answer to ${prevAgent} who asked the question`,
            );
            // 5. Inject the agent part so OpenCode routes it back
            output.parts.unshift({
              type: 'agent',
              name: prevAgent,
            } as AgentPart);
          }
        }
      } catch (e) {
        log(`[question-router] Error in hook: ${e}`);
      }
    },
  };
}
