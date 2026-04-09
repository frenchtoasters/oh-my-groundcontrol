import type { LangfuseHeadersConfig } from '../../config/schema';
import { log } from '../../utils/logger';
import { getCachedVersion } from '../auto-update-checker/checker';

interface ChatHeadersInput {
  sessionID: string;
  agent: string;
  model: { id: string; providerID: string };
  provider: {
    source: string;
    info: unknown;
    options: Record<string, unknown>;
  };
  message: unknown;
}

interface ChatHeadersOutput {
  headers: Record<string, string>;
}

const AGENT_TASK_MAP: Record<string, string> = {
  orchestrator: 'planning',
  explorer: 'research',
  fixer: 'coding',
  designer: 'design',
  librarian: 'research',
  oracle: 'analysis',
  build: 'coding',
  verification: 'verification',
  'pre-flight': 'planning',
  contractor: 'planning',
  groundcontrol: 'planning',
  'power-slap-red': 'coding',
  'power-slap-blue': 'coding',
  'power-slap-green': 'coding',
};

/**
 * Creates the Langfuse trace enrichment headers hook.
 *
 * Injects dynamic `X-OC-*` HTTP headers into every LLM API request,
 * providing rich OpenCode context for Langfuse trace enrichment and
 * training data tagging.
 *
 * Ships disabled by default — enable via config.langfuse_headers.enabled.
 */
export function createLangfuseHeadersHook(
  config?: Partial<LangfuseHeadersConfig>,
) {
  const enabled = config?.enabled ?? false;
  const customHeaders = config?.customHeaders ?? {};
  const pluginVersion = getCachedVersion() ?? 'unknown';

  return {
    'chat.headers': async (
      input: ChatHeadersInput,
      output: ChatHeadersOutput,
    ): Promise<void> => {
      if (!enabled) return;

      try {
        // Build dynamic headers — only assign non-empty strings
        const dynamic: Record<string, string | undefined> = {
          'X-OC-App': 'opencode',
          'X-OC-Agent': input.agent || undefined,
          'X-OC-Task':
            (input.agent && AGENT_TASK_MAP[input.agent]) ||
            (input.agent ? 'general' : undefined),
          'X-OC-Session-Id': input.sessionID || undefined,
          'X-OC-Model': input.model?.id || undefined,
          'X-OC-Provider': input.model?.providerID || undefined,
          'X-OC-Plugin-Version': pluginVersion || undefined,
          'X-OC-Prompt-Version': 'opencode-default',
        };

        // Apply dynamic headers (skip undefined/empty)
        for (const [key, value] of Object.entries(dynamic)) {
          if (value) {
            output.headers[key] = value;
          }
        }

        // Overlay custom headers (custom wins on collision)
        for (const [key, value] of Object.entries(customHeaders)) {
          if (value) {
            output.headers[key] = value;
          }
        }
      } catch (err) {
        log('[langfuse-headers] Error injecting headers:', err);
      }
    },
  };
}
