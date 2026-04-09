import { describe, expect, test } from 'bun:test';
import { createLangfuseHeadersHook } from './index';

const mockInput = (
  overrides: Partial<
    Parameters<ReturnType<typeof createLangfuseHeadersHook>['chat.headers']>[0]
  > = {},
) => ({
  sessionID: 'ses_test123',
  agent: 'explorer',
  model: { id: 'claude-sonnet-4-20250514', providerID: 'anthropic' },
  provider: {
    source: 'config',
    info: {},
    options: {},
  },
  message: {},
  ...overrides,
});

describe('langfuse-headers hook', () => {
  test('defaults to disabled when no config provided', async () => {
    const hook = createLangfuseHeadersHook();
    const output = { headers: {} };

    await hook['chat.headers'](mockInput(), output);

    expect(Object.keys(output.headers)).toHaveLength(0);
  });

  test('does not inject headers when disabled', async () => {
    const hook = createLangfuseHeadersHook({ enabled: false });
    const output = { headers: {} };

    await hook['chat.headers'](mockInput(), output);

    expect(Object.keys(output.headers)).toHaveLength(0);
  });

  test('injects all dynamic headers when enabled', async () => {
    const hook = createLangfuseHeadersHook({ enabled: true });
    const output = { headers: {} as Record<string, string> };

    await hook['chat.headers'](mockInput(), output);

    expect(output.headers['X-OC-App']).toBe('opencode');
    expect(output.headers['X-OC-Agent']).toBe('explorer');
    expect(output.headers['X-OC-Task']).toBe('research');
    expect(output.headers['X-OC-Session-Id']).toBe('ses_test123');
    expect(output.headers['X-OC-Model']).toBe('claude-sonnet-4-20250514');
    expect(output.headers['X-OC-Provider']).toBe('anthropic');
    expect(output.headers['X-OC-Plugin-Version']).toBeDefined();
    expect(output.headers['X-OC-Prompt-Version']).toBe('opencode-default');
  });

  test('derives correct task from known agents', async () => {
    const cases: [string, string][] = [
      ['orchestrator', 'planning'],
      ['explorer', 'research'],
      ['fixer', 'coding'],
      ['designer', 'design'],
      ['librarian', 'research'],
      ['oracle', 'analysis'],
      ['build', 'coding'],
      ['verification', 'verification'],
      ['pre-flight', 'planning'],
    ];

    for (const [agent, expectedTask] of cases) {
      const hook = createLangfuseHeadersHook({ enabled: true });
      const output = { headers: {} as Record<string, string> };

      await hook['chat.headers'](mockInput({ agent }), output);

      expect(output.headers['X-OC-Task']).toBe(expectedTask);
    }
  });

  test('falls back to general for unknown agent', async () => {
    const hook = createLangfuseHeadersHook({ enabled: true });
    const output = { headers: {} as Record<string, string> };

    await hook['chat.headers'](mockInput({ agent: 'custom-agent' }), output);

    expect(output.headers['X-OC-Task']).toBe('general');
  });

  test('omits headers with empty values', async () => {
    const hook = createLangfuseHeadersHook({ enabled: true });
    const output = { headers: {} as Record<string, string> };

    await hook['chat.headers'](mockInput({ agent: '' }), output);

    expect(output.headers['X-OC-Agent']).toBeUndefined();
    expect(output.headers['X-OC-Task']).toBeUndefined();
    // Other headers should still be present
    expect(output.headers['X-OC-App']).toBe('opencode');
    expect(output.headers['X-OC-Model']).toBe('claude-sonnet-4-20250514');
  });

  test('preserves pre-existing headers', async () => {
    const hook = createLangfuseHeadersHook({ enabled: true });
    const output = {
      headers: {
        Authorization: 'Bearer xyz',
        'X-Existing': 'keep-me',
      } as Record<string, string>,
    };

    await hook['chat.headers'](mockInput(), output);

    expect(output.headers.Authorization).toBe('Bearer xyz');
    expect(output.headers['X-Existing']).toBe('keep-me');
    expect(output.headers['X-OC-App']).toBe('opencode');
  });

  test('customHeaders are applied', async () => {
    const hook = createLangfuseHeadersHook({
      enabled: true,
      customHeaders: { 'X-Custom-Foo': 'bar' },
    });
    const output = { headers: {} as Record<string, string> };

    await hook['chat.headers'](mockInput(), output);

    expect(output.headers['X-Custom-Foo']).toBe('bar');
  });

  test('customHeaders override dynamic headers', async () => {
    const hook = createLangfuseHeadersHook({
      enabled: true,
      customHeaders: { 'X-OC-Agent': 'override' },
    });
    const output = { headers: {} as Record<string, string> };

    await hook['chat.headers'](mockInput(), output);

    expect(output.headers['X-OC-Agent']).toBe('override');
  });

  test('does not throw on malformed input', async () => {
    const hook = createLangfuseHeadersHook({ enabled: true });
    const output = { headers: {} as Record<string, string> };

    // Malformed model — missing id/providerID
    await hook['chat.headers'](
      {
        sessionID: 'ses_test',
        agent: 'fixer',
        model: {} as { id: string; providerID: string },
        provider: { source: 'config', info: {}, options: {} },
        message: {},
      },
      output,
    );

    // Should not throw; some headers may be present, some omitted
    expect(output.headers['X-OC-App']).toBe('opencode');
    expect(output.headers['X-OC-Agent']).toBe('fixer');
    expect(output.headers['X-OC-Model']).toBeUndefined();
    expect(output.headers['X-OC-Provider']).toBeUndefined();
  });

  test('uses model.id not model.modelID', async () => {
    const hook = createLangfuseHeadersHook({ enabled: true });
    const output = { headers: {} as Record<string, string> };

    await hook['chat.headers'](
      mockInput({
        model: { id: 'gpt-4o', providerID: 'openai' },
      }),
      output,
    );

    expect(output.headers['X-OC-Model']).toBe('gpt-4o');
    expect(output.headers['X-OC-Provider']).toBe('openai');
  });
});
