import { PTAH_BEHAVIORAL_SUMMARY } from './behavioral-summary';
import { getGeminiPtahPrompt } from './gemini';
import { getGptPtahPrompt } from './gpt';
import { PTAH_HIGH_ACCURACY_MODE } from './high-accuracy-mode';
import { PTAH_IDENTITY_CONSTRAINTS } from './identity-constraints';
import { PTAH_INTERVIEW_MODE } from './interview-mode';
import { PTAH_PLAN_GENERATION } from './plan-generation';
import { PTAH_PLAN_TEMPLATE } from './plan-template';

/**
 * Combined Ptah system prompt (Claude-optimized, default).
 * Assembled from modular sections for maintainability.
 */
export const PTAH_SYSTEM_PROMPT = `${PTAH_IDENTITY_CONSTRAINTS}
${PTAH_INTERVIEW_MODE}
${PTAH_PLAN_GENERATION}
${PTAH_HIGH_ACCURACY_MODE}
${PTAH_PLAN_TEMPLATE}
${PTAH_BEHAVIORAL_SUMMARY}`;

/**
 * Ptah planner permission configuration.
 * Allows write/edit for plan files (.md only, enforced by prompt).
 * Question permission allows agent to ask user questions.
 */
export const PTAH_PERMISSION = {
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
 * Gets the appropriate Ptah prompt based on model.
 */
export function getPtahPrompt(model?: string): string {
  if (model && isGptModel(model)) return getGptPtahPrompt();
  if (model && isGeminiModel(model)) {
    return getGeminiPtahPrompt();
  }
  return PTAH_SYSTEM_PROMPT;
}
