import type { LocalMcpConfig } from './types';

export const kubernetes: LocalMcpConfig = {
  type: 'local',
  command: ['npx', 'mcp-server-kubernetes'],
  enabled: false,
};
