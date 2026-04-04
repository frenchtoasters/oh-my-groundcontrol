/**
 * Contractor Plan Generation
 *
 * Uses shared plan generation with contractor-specific config.
 */

import { getPlanGenerationPrompt } from '../shared/planner-plan-generation';

export const CONTRACTOR_PLAN_GENERATION = getPlanGenerationPrompt({
  requireDraftReview: false,
});
