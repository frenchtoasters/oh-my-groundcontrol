import type { AgentDefinition } from '../orchestrator';
import {
  GROUNDCONTROL_PERMISSION,
  getGroundcontrolPrompt,
} from './system-prompt';

export { GROUNDCONTROL_PERMISSION } from './system-prompt';

export function createGroundcontrolAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt: string;
  if (customPrompt) {
    prompt = customPrompt;
  } else {
    const base = getGroundcontrolPrompt(model);
    prompt = customAppendPrompt ? `${base}\n\n${customAppendPrompt}` : base;
  }
  return {
    name: 'groundcontrol',
    description:
      'Strategic planning consultant that conducts interviews, ' +
      'gathers requirements, and generates decision-complete ' +
      'work plans. Use for complex multi-step tasks needing ' +
      'structured planning.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      ...GROUNDCONTROL_PERMISSION,
    },
  };
}
