/**
 * Groundcontrol Plan Generation
 *
 * Uses shared plan generation with groundcontrol-specific config
 * (requires draft review before plan generation).
 */

import { getPlanGenerationPrompt } from '../shared/planner-plan-generation';

export const GROUNDCONTROL_PLAN_GENERATION = getPlanGenerationPrompt({
  requireDraftReview: true,
});
