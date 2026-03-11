import { GROUNDCONTROL_BEHAVIORAL_SUMMARY } from './behavioral-summary';
import { getGeminiGroundcontrolPrompt } from './gemini';
import { getGptGroundcontrolPrompt } from './gpt';
import { GROUNDCONTROL_HIGH_ACCURACY_MODE } from './high-accuracy-mode';
import { GROUNDCONTROL_IDENTITY_CONSTRAINTS } from './identity-constraints';
import { GROUNDCONTROL_INTERVIEW_MODE } from './interview-mode';
import { GROUNDCONTROL_PLAN_GENERATION } from './plan-generation';
import { GROUNDCONTROL_PLAN_TEMPLATE } from './plan-template';

/**
 * Combined Groundcontrol system prompt (Claude-optimized, default).
 * Assembled from modular sections for maintainability.
 */
export const GROUNDCONTROL_SYSTEM_PROMPT = `${GROUNDCONTROL_IDENTITY_CONSTRAINTS}
${GROUNDCONTROL_INTERVIEW_MODE}
${GROUNDCONTROL_PLAN_GENERATION}
${GROUNDCONTROL_HIGH_ACCURACY_MODE}
${GROUNDCONTROL_PLAN_TEMPLATE}
${GROUNDCONTROL_BEHAVIORAL_SUMMARY}`;

/**
 * Groundcontrol planner permission configuration.
 * Allows write/edit for plan files (.md only, enforced by prompt).
 * Question permission allows agent to ask user questions.
 */
export const GROUNDCONTROL_PERMISSION = {
  edit: 'allow' as const,
  bash: 'allow' as const,
  webfetch: 'allow' as const,
  question: 'allow' as const,
};

function isGptModel(model: string): boolean {
  const name = model.includes('/') ? model.split('/').pop()! : model;
  return name.toLowerCase().includes('gpt');
}

function isGeminiModel(model: string): boolean {
  return (
    model.startsWith('google/') ||
    model.startsWith('google-vertex/') ||
    model.startsWith('github-copilot/gemini') ||
    (model.includes('/') && model.split('/').pop()!.startsWith('gemini-'))
  );
}

/**
 * Gets the appropriate Groundcontrol prompt based on model.
 */
export function getGroundcontrolPrompt(model?: string): string {
  if (model && isGptModel(model)) return getGptGroundcontrolPrompt();
  if (model && isGeminiModel(model)) {
    return getGeminiGroundcontrolPrompt();
  }
  return GROUNDCONTROL_SYSTEM_PROMPT;
}
