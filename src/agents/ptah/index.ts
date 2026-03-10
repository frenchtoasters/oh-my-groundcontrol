import type { AgentDefinition } from '../orchestrator';
import { getPtahPrompt, PTAH_PERMISSION } from './system-prompt';

export { PTAH_PERMISSION } from './system-prompt';

export function createPtahAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt: string;
  if (customPrompt) {
    prompt = customPrompt;
  } else {
    const base = getPtahPrompt(model);
    prompt = customAppendPrompt ? `${base}\n\n${customAppendPrompt}` : base;
  }
  return {
    name: 'ptah',
    description:
      'Strategic planning consultant that conducts interviews, ' +
      'gathers requirements, and generates decision-complete ' +
      'work plans. Use for complex multi-step tasks needing ' +
      'structured planning.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      ...PTAH_PERMISSION,
    },
  };
}
