import type { McpName } from '../config';
import { context7 } from './context7';
import { deepwiki } from './deepwiki';
import { git } from './git';
import { grep_app } from './grep-app';
import { kubernetes } from './kubernetes';
import { pytest } from './pytest';
import type { McpConfig } from './types';
import { websearch } from './websearch';

export type { LocalMcpConfig, McpConfig, RemoteMcpConfig } from './types';

const allBuiltinMcps: Record<McpName, McpConfig> = {
  websearch,
  context7,
  grep_app,
  git,
  pytest,
  deepwiki,
  kubernetes,
};

/**
 * Creates MCP configurations, excluding disabled ones
 */
export function createBuiltinMcps(
  disabledMcps: readonly string[] = [],
): Record<string, McpConfig> {
  return Object.fromEntries(
    Object.entries(allBuiltinMcps).filter(
      ([name]) => !disabledMcps.includes(name),
    ),
  );
}
