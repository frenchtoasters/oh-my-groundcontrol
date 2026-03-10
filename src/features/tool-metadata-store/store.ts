export interface PendingToolMetadata {
  title?: string;
  metadata?: Record<string, unknown>;
}

interface StoredEntry extends PendingToolMetadata {
  storedAt: number;
}

const STALE_MS = 15 * 60 * 1000; // 15 minutes
const store = new Map<string, StoredEntry>();

function makeKey(sessionID: string, callID: string): string {
  return `${sessionID}:${callID}`;
}

function cleanStale(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.storedAt > STALE_MS) {
      store.delete(key);
    }
  }
}

export function storeToolMetadata(
  sessionID: string,
  callID: string,
  data: PendingToolMetadata,
): void {
  cleanStale();
  store.set(makeKey(sessionID, callID), { ...data, storedAt: Date.now() });
}

export function consumeToolMetadata(
  sessionID: string,
  callID: string,
): PendingToolMetadata | undefined {
  const key = makeKey(sessionID, callID);
  const entry = store.get(key);
  if (!entry) return undefined;
  store.delete(key);
  const { storedAt: _, ...rest } = entry;
  return rest;
}

export function getPendingStoreSize(): number {
  return store.size;
}

export function clearPendingStore(): void {
  store.clear();
}
