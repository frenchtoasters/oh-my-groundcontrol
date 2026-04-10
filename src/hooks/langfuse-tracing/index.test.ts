import { describe, expect, test } from 'bun:test';
import { createLangfuseTracingHook } from './index';

const mockInput = (
  overrides: Partial<
    Parameters<ReturnType<typeof createLangfuseTracingHook>['chat.params']>[0]
  > = {},
) => ({
  sessionID: 'ses_test123',
  agent: 'explorer',
  model: {
    id: 'claude-sonnet-4-20250514',
    providerID: 'anthropic',
  },
  provider: {
    source: 'config',
    info: {},
    options: {},
  },
  message: {},
  ...overrides,
});

const mockOutput = (
  overrides: Partial<{
    temperature: number;
    topP: number;
    topK: number;
    options: Record<string, unknown>;
  }> = {},
) => ({
  options: {} as Record<string, unknown>,
  ...overrides,
});

describe('langfuse-tracing hook', () => {
  test('defaults to disabled when no config provided', async () => {
    const hook = createLangfuseTracingHook();
    const output = mockOutput();

    await hook['chat.params'](mockInput(), output);

    expect(output.options.metadata).toBeUndefined();
  });

  test('does not inject metadata when disabled', async () => {
    const hook = createLangfuseTracingHook({ enabled: false });
    const output = mockOutput();

    await hook['chat.params'](mockInput(), output);

    expect(output.options.metadata).toBeUndefined();
  });

  test('injects all metadata fields when enabled', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput();

    await hook['chat.params'](mockInput(), output);

    const meta = output.options.metadata as Record<string, unknown>;
    expect(meta.tags).toEqual(['opencode', 'explorer', 'research']);
    expect(meta.session_id).toBe('ses_test123');
    expect(meta.trace_user_id).toBe('opencode');
    expect(meta.trace_name).toBe('explorer');
    expect(meta.generation_name).toBe('research');
    expect(meta.model).toBe('claude-sonnet-4-20250514');
    expect(meta.provider).toBe('anthropic');
    expect(meta.plugin_version).toBeDefined();
  });

  test('derives correct task from known agents', async () => {
    const cases: [string, string][] = [
      ['orchestrator', 'planning'],
      ['explorer', 'research'],
      ['fixer', 'coding'],
      ['designer', 'design'],
      ['librarian', 'research'],
      ['oracle', 'analysis'],
      ['verification', 'verification'],
      ['pre-flight', 'planning'],
    ];

    for (const [agent, expectedTask] of cases) {
      const hook = createLangfuseTracingHook({ enabled: true });
      const output = mockOutput();

      await hook['chat.params'](mockInput({ agent }), output);

      const meta = output.options.metadata as Record<string, unknown>;
      expect(meta.generation_name).toBe(expectedTask);
    }
  });

  test('falls back to general for unknown agent', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput();

    await hook['chat.params'](mockInput({ agent: 'custom-agent' }), output);

    const meta = output.options.metadata as Record<string, unknown>;
    expect(meta.generation_name).toBe('general');
    expect(meta.tags).toEqual(['opencode', 'custom-agent', 'general']);
  });

  test('omits fields with empty values', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput();

    await hook['chat.params'](mockInput({ agent: '' }), output);

    const meta = output.options.metadata as Record<string, unknown>;
    // trace_name should be absent (empty agent)
    expect(meta.trace_name).toBeUndefined();
    expect(meta.generation_name).toBeUndefined();
    // tags should only have 'opencode'
    expect(meta.tags).toEqual(['opencode']);
    // Other fields should still be present
    expect(meta.model).toBe('claude-sonnet-4-20250514');
  });

  test('preserves pre-existing options', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput({
      options: {
        someExistingKey: 'keep-me',
      },
    });

    await hook['chat.params'](mockInput(), output);

    expect(output.options.someExistingKey).toBe('keep-me');
    expect(output.options.metadata).toBeDefined();
  });

  test('preserves pre-existing metadata', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput({
      options: {
        metadata: {
          existingKey: 'preserve-me',
        },
      },
    });

    await hook['chat.params'](mockInput(), output);

    const meta = output.options.metadata as Record<string, unknown>;
    expect(meta.existingKey).toBe('preserve-me');
    expect(meta.tags).toEqual(['opencode', 'explorer', 'research']);
  });

  test('customMetadata is applied', async () => {
    const hook = createLangfuseTracingHook({
      enabled: true,
      customMetadata: { environment: 'production', team: 'infra' },
    });
    const output = mockOutput();

    await hook['chat.params'](mockInput(), output);

    const meta = output.options.metadata as Record<string, unknown>;
    expect(meta.environment).toBe('production');
    expect(meta.team).toBe('infra');
  });

  test('customMetadata overrides dynamic fields', async () => {
    const hook = createLangfuseTracingHook({
      enabled: true,
      customMetadata: { trace_name: 'custom-trace' },
    });
    const output = mockOutput();

    await hook['chat.params'](mockInput(), output);

    const meta = output.options.metadata as Record<string, unknown>;
    expect(meta.trace_name).toBe('custom-trace');
  });

  test('does not throw on malformed input', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput();

    // Malformed model — missing id/providerID
    await hook['chat.params'](
      {
        sessionID: 'ses_test',
        agent: 'fixer',
        model: {} as { id: string; providerID: string },
        provider: { source: 'config', info: {}, options: {} },
        message: {},
      },
      output,
    );

    const meta = output.options.metadata as Record<string, unknown>;
    // Should not throw; known fields present, missing ones omitted
    expect(meta.trace_name).toBe('fixer');
    expect(meta.generation_name).toBe('coding');
    expect(meta.model).toBeUndefined();
    expect(meta.provider).toBeUndefined();
  });

  test('uses model.id not model.modelID', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput();

    await hook['chat.params'](
      mockInput({
        model: { id: 'gpt-4o', providerID: 'openai' },
      }),
      output,
    );

    const meta = output.options.metadata as Record<string, unknown>;
    expect(meta.model).toBe('gpt-4o');
    expect(meta.provider).toBe('openai');
  });

  test('respects custom traceUserId', async () => {
    const hook = createLangfuseTracingHook({
      enabled: true,
      traceUserId: 'my-org-user',
    });
    const output = mockOutput();

    await hook['chat.params'](mockInput(), output);

    const meta = output.options.metadata as Record<string, unknown>;
    expect(meta.trace_user_id).toBe('my-org-user');
  });

  test('does not mutate temperature/topP/topK', async () => {
    const hook = createLangfuseTracingHook({ enabled: true });
    const output = mockOutput({
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
    });

    await hook['chat.params'](mockInput(), output);

    expect(output.temperature).toBe(0.7);
    expect(output.topP).toBe(0.9);
    expect(output.topK).toBe(40);
  });
});
