import type { LocalMcpConfig } from './types';

export const pytest: LocalMcpConfig = {
  type: 'local',
  command: ['uvx', 'mcp-pytest-runner'],
};
