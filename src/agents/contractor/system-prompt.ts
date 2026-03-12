import { CONTRACTOR_BEHAVIORAL_SUMMARY } from './behavioral-summary';
import { getGeminiPtahPrompt } from './gemini';
import { getGptPtahPrompt } from './gpt';
import { CONTRACTOR_HIGH_ACCURACY_MODE } from './high-accuracy-mode';
import { CONTRACTOR_IDENTITY_CONSTRAINTS } from './identity-constraints';
import { CONTRACTOR_INTERVIEW_MODE } from './interview-mode';
import { CONTRACTOR_PLAN_GENERATION } from './plan-generation';
import { CONTRACTOR_PLAN_TEMPLATE } from './plan-template';

/**
 * Combined Contractor system prompt (Claude-optimized, default).
 * Assembled from modular sections for maintainability.
 */
export const CONTRACTOR_SYSTEM_PROMPT = `${CONTRACTOR_IDENTITY_CONSTRAINTS}
${CONTRACTOR_INTERVIEW_MODE}
${CONTRACTOR_PLAN_GENERATION}
${CONTRACTOR_HIGH_ACCURACY_MODE}
${CONTRACTOR_PLAN_TEMPLATE}
${CONTRACTOR_BEHAVIORAL_SUMMARY}`;

/**
 * Contractor planner permission configuration.
 * Allows write/edit for plan files (.md only, enforced by prompt).
 * Question permission allows agent to ask user questions.
 */
export const CONTRACTOR_PERMISSION = {
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
 * Gets the appropriate Contractor prompt based on model.
 */
export function getContractorPrompt(model?: string): string {
  if (model && isGptModel(model)) return getGptPtahPrompt();
  if (model && isGeminiModel(model)) {
    return getGeminiPtahPrompt();
  }
  return CONTRACTOR_SYSTEM_PROMPT;
}
