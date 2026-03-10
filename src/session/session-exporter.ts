import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { PluginInput } from '@opencode-ai/plugin';
import type { SessionExportConfig } from '../config/schema';
import { log } from '../utils/logger';

type OpencodeClient = PluginInput['client'];

interface SessionMessage {
  role: string;
  parts: Array<{ type: string; text?: string }>;
}

interface SessionExportData {
  version: number;
  exportedAt: string;
  reason: 'idle' | 'inactivity' | 'close';
  sessionId: string;
  messages: SessionMessage[];
}

interface SessionEvent {
  type: string;
  properties?: {
    info?: { id?: string; parentID?: string; title?: string };
    sessionID?: string;
    status?: { type: string };
  };
}

/** Injectable I/O functions for testability. */
export interface SessionExporterIO {
  existsSync: (path: string) => boolean;
  mkdirSync: (path: string, opts: { recursive: boolean }) => void;
  writeFile: (path: string, data: string) => Promise<void>;
  writeFileSync: (path: string, data: string) => void;
}

const defaultIO: SessionExporterIO = {
  existsSync,
  mkdirSync: (path, opts) => {
    mkdirSync(path, opts);
  },
  writeFile: async (path, data) => {
    await writeFile(path, data);
  },
  writeFileSync: (path, data) => {
    writeFileSync(path, data);
  },
};

const DEFAULT_EXPORT_DIR = join(
  homedir(),
  '.opencode',
  'oh-my-groundcontrol',
  'sessions',
);

export class SessionExporter {
  private client: OpencodeClient;
  private io: SessionExporterIO;
  private exportDir: string;
  private mainSessionId: string | null = null;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityTimeoutMs: number;
  private enabled: boolean;
  private cachedMessages: SessionMessage[] = [];
  private lastExportedMessageCount = 0;
  private disposed = false;

  private boundShutdownHandler: () => void = () => {};

  constructor(
    client: OpencodeClient,
    config?: SessionExportConfig,
    io?: SessionExporterIO,
  ) {
    this.client = client;
    this.io = io ?? defaultIO;
    this.enabled = config?.enabled ?? true;
    this.inactivityTimeoutMs = config?.inactivityTimeoutMs ?? 3600000;

    // Resolve export directory, expanding ~ if present
    const configDir = config?.exportDir;
    if (configDir) {
      this.exportDir = configDir.startsWith('~')
        ? join(homedir(), configDir.slice(1))
        : configDir;
    } else {
      this.exportDir = DEFAULT_EXPORT_DIR;
    }

    if (!this.enabled) return;

    // Ensure export directory exists
    if (!this.io.existsSync(this.exportDir)) {
      this.io.mkdirSync(this.exportDir, { recursive: true });
    }

    // Register shutdown handlers for sync export on close
    this.boundShutdownHandler = () => this.handleShutdown();
    process.on('SIGINT', this.boundShutdownHandler);
    process.on('SIGTERM', this.boundShutdownHandler);

    log('[session-exporter] initialized', {
      exportDir: this.exportDir,
      inactivityTimeoutMs: this.inactivityTimeoutMs,
    });
  }

  /**
   * Handle session events forwarded from the plugin event handler.
   */
  async onSessionEvent(event: SessionEvent): Promise<void> {
    if (!this.enabled) return;

    const { type, properties } = event;

    if (type === 'session.created') {
      const info = properties?.info;
      // Main session has no parentID
      if (info?.id && !info.parentID) {
        this.mainSessionId = info.id;
        this.resetInactivityTimer();
        log('[session-exporter] tracking main session', {
          sessionId: info.id,
        });
      }
      return;
    }

    if (type === 'session.status') {
      const sessionId = properties?.sessionID;
      if (!sessionId || sessionId !== this.mainSessionId) return;

      const status = properties?.status?.type;

      // Reset inactivity timer on any status event for main session
      this.resetInactivityTimer();

      // Export when session goes idle
      if (status === 'idle') {
        await this.exportSession('idle');
      }
      return;
    }

    if (type === 'session.deleted') {
      const sessionId = properties?.info?.id ?? properties?.sessionID;
      if (sessionId && sessionId === this.mainSessionId) {
        await this.exportSession('close');
        this.mainSessionId = null;
        this.clearInactivityTimer();
      }
    }
  }

  /**
   * Export the main session to a JSON file (async).
   */
  private async exportSession(
    reason: 'idle' | 'inactivity' | 'close',
  ): Promise<void> {
    if (!this.mainSessionId) return;

    try {
      const messages = await this.fetchMessages(this.mainSessionId);

      // Cache messages for potential sync export on shutdown
      this.cachedMessages = messages;

      // Skip if nothing changed since last export
      if (messages.length === this.lastExportedMessageCount) {
        log('[session-exporter] skipping export, no new messages', {
          reason,
        });
        return;
      }

      const exportData = this.buildExportData(
        reason,
        this.mainSessionId,
        messages,
      );

      const filePath = this.getExportPath(this.mainSessionId);
      await this.io.writeFile(filePath, JSON.stringify(exportData, null, 2));

      this.lastExportedMessageCount = messages.length;

      log('[session-exporter] exported session', {
        reason,
        sessionId: this.mainSessionId,
        messageCount: messages.length,
        path: filePath,
      });
    } catch (error) {
      log('[session-exporter] export failed', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Export the main session synchronously (for shutdown handler).
   * Uses cached messages from the most recent async export.
   */
  private exportSessionSync(reason: 'close'): void {
    if (!this.mainSessionId || this.cachedMessages.length === 0) {
      return;
    }

    // Skip if nothing changed since last export
    if (this.cachedMessages.length === this.lastExportedMessageCount) {
      return;
    }

    try {
      const exportData = this.buildExportData(
        reason,
        this.mainSessionId,
        this.cachedMessages,
      );

      const filePath = this.getExportPath(this.mainSessionId);
      this.io.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

      this.lastExportedMessageCount = this.cachedMessages.length;

      log('[session-exporter] sync exported session on shutdown', {
        sessionId: this.mainSessionId,
        messageCount: this.cachedMessages.length,
        path: filePath,
      });
    } catch (error) {
      log('[session-exporter] sync export failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Fetch all messages for a session and normalize them.
   */
  private async fetchMessages(sessionId: string): Promise<SessionMessage[]> {
    const result = await this.client.session.messages({
      path: { id: sessionId },
    });

    const rawMessages = (result.data ?? []) as Array<{
      info?: { role: string };
      parts?: Array<{ type: string; text?: string }>;
    }>;

    return rawMessages
      .filter((m) => m.info?.role)
      .map((m) => ({
        role: m.info?.role ?? 'unknown',
        parts: (m.parts ?? []).filter(
          (p) => (p.type === 'text' || p.type === 'reasoning') && p.text,
        ),
      }));
  }

  /**
   * Build the structured export data object.
   */
  private buildExportData(
    reason: 'idle' | 'inactivity' | 'close',
    sessionId: string,
    messages: SessionMessage[],
  ): SessionExportData {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      reason,
      sessionId,
      messages,
    };
  }

  /**
   * Get the file path for a session export.
   * Same session always maps to the same file (overwrites).
   */
  private getExportPath(sessionId: string): string {
    return join(this.exportDir, `${sessionId}.json`);
  }

  /**
   * Reset the inactivity timer.
   */
  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.inactivityTimer = setTimeout(async () => {
      log('[session-exporter] inactivity timeout reached');
      await this.exportSession('inactivity');
    }, this.inactivityTimeoutMs);
  }

  /**
   * Clear the inactivity timer.
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Handle process shutdown — sync export.
   */
  private handleShutdown(): void {
    if (this.disposed) return;
    this.exportSessionSync('close');
    this.dispose();
  }

  /**
   * Clean up timers and signal handlers.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearInactivityTimer();
    process.removeListener('SIGINT', this.boundShutdownHandler);
    process.removeListener('SIGTERM', this.boundShutdownHandler);
    log('[session-exporter] disposed');
  }
}
