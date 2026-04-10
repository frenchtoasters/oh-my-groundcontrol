/**
 * Shared Langfuse utilities for agent-to-task mapping and tag derivation.
 */

export const AGENT_TASK_MAP: Record<string, string> = {
  orchestrator: 'planning',
  explorer: 'research',
  fixer: 'coding',
  designer: 'design',
  librarian: 'research',
  oracle: 'analysis',
  verification: 'verification',
  'pre-flight': 'planning',
  contractor: 'planning',
  groundcontrol: 'planning',
};

/**
 * Derive the task type for an agent.
 * Returns undefined for empty agent.
 * Falls back to 'general' for unknown agents.
 */
export function deriveTask(agent: string): string | undefined {
  if (!agent) return undefined;
  return AGENT_TASK_MAP[agent] ?? 'general';
}

/**
 * Derive Langfuse tags for an agent.
 * Returns ['opencode', agentName, taskType], filtering out empty values.
 */
export function deriveTags(agent: string): string[] {
  const tags: string[] = [];
  if (agent) tags.push(`agent:${agent}`);
  const task = deriveTask(agent);
  if (task) tags.push(`task:${task}`);
  return tags;
}
