import type { LangfuseTracingConfig } from '../../config/schema';
import { log } from '../../utils/logger';
import { getCachedVersion } from '../auto-update-checker/checker';
import { deriveTags, deriveTask } from '../langfuse-common';

interface ChatParamsInput {
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

interface ChatParamsOutput {
  temperature?: number;
  topP?: number;
  topK?: number;
  options: Record<string, unknown>;
}

/**
 * Creates the Langfuse tracing hook.
 *
 * Injects metadata into the LLM request body via `chat.params`
 * → `output.options.metadata`, which flows through the Vercel AI
 * SDK's `providerOptions` into the HTTP request body.
 *
 * LiteLLM proxy reads body-level `metadata` and forwards recognised
 * keys (tags, session_id, trace_user_id, trace_name,
 * generation_name) to Langfuse for trace enrichment.
 *
 * Ships disabled by default — enable via
 * config.langfuse_tracing.enabled.
 */
export function createLangfuseTracingHook(
  config?: Partial<LangfuseTracingConfig>,
) {
  const enabled = config?.enabled ?? false;
  const traceUserId = config?.traceUserId ?? 'opencode';
  const customMetadata = config?.customMetadata ?? {};
  const pluginVersion = getCachedVersion() ?? 'unknown';

  return {
    'chat.params': async (
      input: ChatParamsInput,
      output: ChatParamsOutput,
    ): Promise<void> => {
      if (!enabled) return;

      try {
        const tags = deriveTags(input.agent);
        const task = deriveTask(input.agent);

        // Build the metadata payload LiteLLM forwards to
        // Langfuse.
        const metadata: Record<string, unknown> = {
          // Carry forward non-conflicting metadata from SDK /
          // other hooks. Langfuse-specific keys below take
          // precedence.
          ...((output.options.metadata as Record<string, unknown>) ?? {}),
          tags,
          session_id: input.sessionID || undefined,
          trace_user_id: traceUserId || undefined,
          trace_name: input.agent || undefined,
          generation_name: task || undefined,
          // Extra context (passthrough — Langfuse stores as
          // metadata)
          model: input.model?.id || undefined,
          provider: input.model?.providerID || undefined,
          plugin_version: pluginVersion || undefined,
        };

        // Overlay custom metadata (custom wins on collision)
        for (const [key, value] of Object.entries(customMetadata)) {
          if (value !== undefined && value !== null) {
            metadata[key] = value;
          }
        }

        // Strip undefined values for a clean payload
        for (const key of Object.keys(metadata)) {
          if (metadata[key] === undefined) {
            delete metadata[key];
          }
        }

        output.options.metadata = metadata;
      } catch (err) {
        log('[langfuse-tracing] Error injecting metadata:', err);
      }
    },
  };
}
