import type { LocalMcpConfig } from './types';

export const git: LocalMcpConfig = {
  type: 'local',
  command: ['uvx', 'mcp-server-git'],
};
