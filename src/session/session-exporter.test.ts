import { afterAll, describe, expect, mock, test } from 'bun:test';
import { join } from 'node:path';
import type { SessionExporterIO } from './session-exporter';

const { SessionExporter } = await import('./session-exporter');

// --- Helpers ---

function createMockIO(): SessionExporterIO & {
  existsSync: ReturnType<typeof mock>;
  mkdirSync: ReturnType<typeof mock>;
  writeFile: ReturnType<typeof mock>;
  writeFileSync: ReturnType<typeof mock>;
} {
  return {
    existsSync: mock(() => true),
    mkdirSync: mock(() => {}),
    writeFile: mock(async () => {}),
    writeFileSync: mock(() => {}),
  };
}

function createMockClient(overrides?: {
  messagesResult?: {
    data?: Array<{
      info?: { role: string };
      parts?: Array<{ type: string; text?: string }>;
    }>;
  };
}) {
  return {
    session: {
      create: mock(async () => ({ data: { id: 'test-session' } })),
      status: mock(async () => ({ data: {} })),
      messages: mock(async () => overrides?.messagesResult ?? { data: [] }),
      prompt: mock(async () => ({})),
      abort: mock(async () => ({})),
    },
  } as any;
}

const SAMPLE_MESSAGES = {
  data: [
    {
      info: { role: 'user' },
      parts: [{ type: 'text', text: 'Hello, how are you?' }],
    },
    {
      info: { role: 'assistant' },
      parts: [
        {
          type: 'reasoning',
          text: 'Thinking about a response...',
        },
        { type: 'text', text: 'I am doing well!' },
      ],
    },
  ],
};

const MORE_MESSAGES = {
  data: [
    ...SAMPLE_MESSAGES.data,
    {
      info: { role: 'user' },
      parts: [{ type: 'text', text: 'Follow up question' }],
    },
    {
      info: { role: 'assistant' },
      parts: [{ type: 'text', text: 'Here is the answer' }],
    },
  ],
};

function mainSessionCreatedEvent(id = 'main-session-1') {
  return {
    type: 'session.created',
    properties: { info: { id } },
  };
}

function childSessionCreatedEvent(
  id = 'child-session-1',
  parentID = 'main-session-1',
) {
  return {
    type: 'session.created',
    properties: { info: { id, parentID } },
  };
}

function sessionIdleEvent(sessionID = 'main-session-1') {
  return {
    type: 'session.status',
    properties: { sessionID, status: { type: 'idle' } },
  };
}

function sessionBusyEvent(sessionID = 'main-session-1') {
  return {
    type: 'session.status',
    properties: { sessionID, status: { type: 'busy' } },
  };
}

function sessionDeletedEvent(id = 'main-session-1') {
  return {
    type: 'session.deleted',
    properties: { info: { id } },
  };
}

// --- Tests ---

describe('SessionExporter', () => {
  describe('constructor', () => {
    test('creates export directory if it does not exist', () => {
      const io = createMockIO();
      io.existsSync.mockReturnValueOnce(false);
      const client = createMockClient();
      const exporter = new SessionExporter(client, undefined, io);

      expect(io.mkdirSync).toHaveBeenCalledTimes(1);
      expect(io.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
        recursive: true,
      });

      exporter.dispose();
    });

    test('does not create directory if it already exists', () => {
      const io = createMockIO();
      io.existsSync.mockReturnValueOnce(true);
      const client = createMockClient();
      const exporter = new SessionExporter(client, undefined, io);

      expect(io.mkdirSync).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('uses custom export directory from config', () => {
      const io = createMockIO();
      io.existsSync.mockReturnValueOnce(false);
      const client = createMockClient();
      const exporter = new SessionExporter(
        client,
        {
          enabled: true,
          inactivityTimeoutMs: 3600000,
          exportDir: '/custom/export/dir',
        },
        io,
      );

      expect(io.mkdirSync).toHaveBeenCalledWith('/custom/export/dir', {
        recursive: true,
      });

      exporter.dispose();
    });

    test('expands tilde in export directory', () => {
      const io = createMockIO();
      io.existsSync.mockReturnValueOnce(false);
      const client = createMockClient();
      const { homedir } = require('node:os');
      const home = homedir();
      const exporter = new SessionExporter(
        client,
        {
          enabled: true,
          inactivityTimeoutMs: 3600000,
          exportDir: '~/my-exports',
        },
        io,
      );

      expect(io.mkdirSync).toHaveBeenCalledWith(join(home, 'my-exports'), {
        recursive: true,
      });

      exporter.dispose();
    });

    test('does not register handlers when disabled', () => {
      const io = createMockIO();
      const client = createMockClient();
      const exporter = new SessionExporter(
        client,
        { enabled: false, inactivityTimeoutMs: 3600000 },
        io,
      );

      expect(io.mkdirSync).not.toHaveBeenCalled();
      expect(io.existsSync).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('uses default settings with no config', () => {
      const io = createMockIO();
      const client = createMockClient();
      const exporter = new SessionExporter(client, undefined, io);

      expect(exporter).toBeDefined();

      exporter.dispose();
    });
  });

  describe('session tracking', () => {
    test('tracks main session (no parentID)', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      expect(client.session.messages).toHaveBeenCalledWith({
        path: { id: 'ses-1' },
      });

      exporter.dispose();
    });

    test('ignores child sessions (has parentID)', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(
        childSessionCreatedEvent('child-1', 'parent-1'),
      );
      await exporter.onSessionEvent(sessionIdleEvent('child-1'));

      expect(client.session.messages).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('ignores events when disabled', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(
        client,
        { enabled: false, inactivityTimeoutMs: 3600000 },
        io,
      );

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      expect(client.session.messages).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('ignores status events for non-tracked sessions', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('different-session'));

      expect(client.session.messages).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('tracks only the latest main session', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-2'));

      // Idle for ses-1 should be ignored
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(client.session.messages).not.toHaveBeenCalled();

      // Idle for ses-2 should trigger export
      await exporter.onSessionEvent(sessionIdleEvent('ses-2'));
      expect(client.session.messages).toHaveBeenCalledWith({
        path: { id: 'ses-2' },
      });

      exporter.dispose();
    });
  });

  describe('idle export', () => {
    test('exports session when it goes idle', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      expect(client.session.messages).toHaveBeenCalledTimes(1);
      expect(io.writeFile).toHaveBeenCalledTimes(1);

      const [filePath, content] = io.writeFile.mock.calls[0] as unknown as [
        string,
        string,
      ];
      expect(filePath).toContain('ses-1.json');

      const exportData = JSON.parse(content);
      expect(exportData.version).toBe(1);
      expect(exportData.reason).toBe('idle');
      expect(exportData.sessionId).toBe('ses-1');
      expect(exportData.messages).toHaveLength(2);
      expect(exportData.exportedAt).toBeDefined();

      exporter.dispose();
    });

    test('filters to only text and reasoning parts', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: {
          data: [
            {
              info: { role: 'user' },
              parts: [
                { type: 'text', text: 'Hello' },
                { type: 'tool_call', text: 'ignored' },
              ],
            },
            {
              info: { role: 'assistant' },
              parts: [
                { type: 'reasoning', text: 'Thinking...' },
                { type: 'text', text: 'Response' },
                { type: 'tool_result', text: 'also ignored' },
              ],
            },
          ],
        },
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      const [, content] = io.writeFile.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const exportData = JSON.parse(content);

      expect(exportData.messages[0].parts).toHaveLength(1);
      expect(exportData.messages[0].parts[0].type).toBe('text');

      expect(exportData.messages[1].parts).toHaveLength(2);
      expect(exportData.messages[1].parts[0].type).toBe('reasoning');
      expect(exportData.messages[1].parts[1].type).toBe('text');

      exporter.dispose();
    });

    test('filters out messages without a role', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: {
          data: [
            {
              info: { role: 'user' },
              parts: [{ type: 'text', text: 'Hi' }],
            },
            { parts: [{ type: 'text', text: 'No role' }] },
            {
              info: { role: 'assistant' },
              parts: [{ type: 'text', text: 'Hello' }],
            },
          ],
        },
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      const [, content] = io.writeFile.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const exportData = JSON.parse(content);
      expect(exportData.messages).toHaveLength(2);
      expect(exportData.messages[0].role).toBe('user');
      expect(exportData.messages[1].role).toBe('assistant');

      exporter.dispose();
    });

    test('does not export when busy status fires', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionBusyEvent('ses-1'));

      expect(client.session.messages).not.toHaveBeenCalled();
      expect(io.writeFile).not.toHaveBeenCalled();

      exporter.dispose();
    });
  });

  describe('deduplication', () => {
    test('skips export if message count has not changed', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(io.writeFile).toHaveBeenCalledTimes(1);

      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(io.writeFile).toHaveBeenCalledTimes(1); // Still 1

      exporter.dispose();
    });

    test('exports again when new messages appear', async () => {
      const io = createMockIO();
      let callCount = 0;
      const client = createMockClient();
      client.session.messages = mock(async () => {
        callCount++;
        return callCount === 1 ? SAMPLE_MESSAGES : MORE_MESSAGES;
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(io.writeFile).toHaveBeenCalledTimes(1);

      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(io.writeFile).toHaveBeenCalledTimes(2);

      exporter.dispose();
    });
  });

  describe('file overwriting', () => {
    test('overwrites the same file for the same session', async () => {
      const io = createMockIO();
      let callCount = 0;
      const client = createMockClient();
      client.session.messages = mock(async () => {
        callCount++;
        return callCount === 1 ? SAMPLE_MESSAGES : MORE_MESSAGES;
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      const calls = io.writeFile.mock.calls as unknown as Array<
        [string, string]
      >;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toBe(calls[1][0]);
      expect(calls[0][0]).toContain('ses-1.json');

      exporter.dispose();
    });
  });

  describe('session.deleted', () => {
    test('exports and clears main session on deleted event', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionDeletedEvent('ses-1'));

      expect(client.session.messages).toHaveBeenCalledTimes(1);
      expect(io.writeFile).toHaveBeenCalledTimes(1);

      const [, content] = io.writeFile.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const exportData = JSON.parse(content);
      expect(exportData.reason).toBe('close');

      // After deletion, idle events should not trigger export
      client.session.messages.mockClear();
      io.writeFile.mockClear();
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(client.session.messages).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('ignores deleted event for non-tracked session', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionDeletedEvent('other-session'));

      expect(client.session.messages).not.toHaveBeenCalled();

      exporter.dispose();
    });
  });

  describe('inactivity timer', () => {
    test('exports after inactivity timeout', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(
        client,
        { enabled: true, inactivityTimeoutMs: 100 },
        io,
      );

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      await new Promise((r) => setTimeout(r, 200));

      expect(client.session.messages).toHaveBeenCalledTimes(1);
      expect(io.writeFile).toHaveBeenCalledTimes(1);

      const [, content] = io.writeFile.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const exportData = JSON.parse(content);
      expect(exportData.reason).toBe('inactivity');

      exporter.dispose();
    });

    test('resets inactivity timer on status events', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(
        client,
        { enabled: true, inactivityTimeoutMs: 150 },
        io,
      );

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      await new Promise((r) => setTimeout(r, 50));
      await exporter.onSessionEvent(sessionBusyEvent('ses-1'));

      await new Promise((r) => setTimeout(r, 50));
      await exporter.onSessionEvent(sessionBusyEvent('ses-1'));

      // At ~100ms, timer was reset at 50ms and 100ms
      expect(io.writeFile).not.toHaveBeenCalled();

      // Wait for timer to fire (~100ms + 150ms)
      await new Promise((r) => setTimeout(r, 200));

      expect(io.writeFile).toHaveBeenCalledTimes(1);

      exporter.dispose();
    });

    test('clears inactivity timer on dispose', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(
        client,
        { enabled: true, inactivityTimeoutMs: 100 },
        io,
      );

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      exporter.dispose();

      await new Promise((r) => setTimeout(r, 200));

      expect(io.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('sync export (shutdown)', () => {
    test('sync export uses cached messages from last async export', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      // Trigger async export to populate cache
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(io.writeFile).toHaveBeenCalledTimes(1);

      // Now update the mock to return more messages
      client.session.messages = mock(async () => MORE_MESSAGES);

      // Trigger another async export to update cache
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));
      expect(io.writeFile).toHaveBeenCalledTimes(2);

      exporter.dispose();
    });

    test('sync export skips when no cached messages exist', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: { data: [] },
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      exporter.dispose();

      expect(io.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('handles message fetch errors gracefully', async () => {
      const io = createMockIO();
      const client = createMockClient();
      client.session.messages = mock(async () => {
        throw new Error('Network error');
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      // Should not throw
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      expect(io.writeFile).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('handles write errors gracefully', async () => {
      const io = createMockIO();
      io.writeFile.mockImplementationOnce(async () => {
        throw new Error('Disk full');
      });
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));

      // Should not throw
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      expect(io.writeFile).toHaveBeenCalledTimes(1);

      exporter.dispose();
    });

    test('handles empty session messages', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: { data: [] },
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      // Empty = 0 = same as initial count, skip
      expect(io.writeFile).not.toHaveBeenCalled();

      exporter.dispose();
    });

    test('handles null/undefined data in messages response', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: { data: undefined } as any,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      expect(io.writeFile).not.toHaveBeenCalled();

      exporter.dispose();
    });
  });

  describe('export data structure', () => {
    test('produces valid structured JSON with all fields', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      const [, content] = io.writeFile.mock.calls[0] as unknown as [
        string,
        string,
      ];
      const exportData = JSON.parse(content);

      expect(exportData).toEqual({
        version: 1,
        exportedAt: expect.any(String),
        reason: 'idle',
        sessionId: 'ses-1',
        messages: [
          {
            role: 'user',
            parts: [
              {
                type: 'text',
                text: 'Hello, how are you?',
              },
            ],
          },
          {
            role: 'assistant',
            parts: [
              {
                type: 'reasoning',
                text: 'Thinking about a response...',
              },
              { type: 'text', text: 'I am doing well!' },
            ],
          },
        ],
      });

      // Verify exportedAt is a valid ISO timestamp
      expect(() => new Date(exportData.exportedAt)).not.toThrow();

      exporter.dispose();
    });

    test('formats JSON with 2-space indentation', async () => {
      const io = createMockIO();
      const client = createMockClient({
        messagesResult: SAMPLE_MESSAGES,
      });
      const exporter = new SessionExporter(client, undefined, io);

      await exporter.onSessionEvent(mainSessionCreatedEvent('ses-1'));
      await exporter.onSessionEvent(sessionIdleEvent('ses-1'));

      const [, rawJson] = io.writeFile.mock.calls[0] as unknown as [
        string,
        string,
      ];

      expect(rawJson).toContain('  "version"');
      expect(rawJson).toContain('  "messages"');

      exporter.dispose();
    });
  });

  describe('dispose', () => {
    test('is idempotent (safe to call multiple times)', () => {
      const io = createMockIO();
      const client = createMockClient();
      const exporter = new SessionExporter(client, undefined, io);

      exporter.dispose();
      exporter.dispose();
      exporter.dispose();

      expect(true).toBe(true);
    });
  });

  afterAll(() => {
    mock.restore();
  });
});
