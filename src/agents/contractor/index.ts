import type { AgentDefinition } from '../orchestrator';
import { CONTRACTOR_PERMISSION, getContractorPrompt } from './system-prompt';

export { CONTRACTOR_PERMISSION } from './system-prompt';

export function createContractorAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt: string;
  if (customPrompt) {
    prompt = customPrompt;
  } else {
    const base = getContractorPrompt(model);
    prompt = customAppendPrompt ? `${base}\n\n${customAppendPrompt}` : base;
  }
  return {
    name: 'contractor',
    description:
      'Strategic planning consultant that conducts interviews, ' +
      'gathers requirements, and generates decision-complete ' +
      'work plans. Use for complex multi-step tasks needing ' +
      'structured planning.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      ...CONTRACTOR_PERMISSION,
    },
  };
}
