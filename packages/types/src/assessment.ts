import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';
import { EmergencyBlockSchema } from './chat.js';

/**
 * Contextualized self-diagnosis (docs/03 §3.7, docs/07 §7.1). ALWAYS possibilities +
 * triage, NEVER a diagnosis. The medical engine (Infermedica or equivalent) produces
 * these; the app frames them with a mandatory disclaimer.
 */
export const TriageLevelSchema = z.enum(['self_care', 'consult_soon', 'consult_urgent', 'emergency']);
export type TriageLevel = z.infer<typeof TriageLevelSchema>;

export const ConditionPossibilitySchema = z.object({
  name: z.string(),
  /** 0..1 relative likelihood from the engine — NOT a probability of having it. */
  likelihood: z.number().min(0).max(1),
  commonName: z.string().nullable(),
});
export type ConditionPossibility = z.infer<typeof ConditionPossibilitySchema>;

export const AssessmentResultSchema = z.object({
  triage: TriageLevelSchema,
  possibilities: z.array(ConditionPossibilitySchema),
  advice: z.string(),
});
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

export const AssessmentSchema = z.object({
  id: IdSchema,
  reportedSymptoms: z.array(z.string()),
  engine: z.string(),
  result: AssessmentResultSchema,
  disclaimerShown: z.literal(true),
  shareable: z.boolean(),
  createdAt: TimestampSchema,
});
export type Assessment = z.infer<typeof AssessmentSchema>;

export const CreateAssessmentSchema = z.object({
  symptoms: z.array(z.string().min(1)).min(1).max(20),
});
export type CreateAssessment = z.infer<typeof CreateAssessmentSchema>;

/** Response to creating an assessment — may instead be an emergency (safety gate). */
export const CreateAssessmentResponseSchema = z.object({
  assessment: AssessmentSchema.nullable(),
  emergency: EmergencyBlockSchema.nullable(),
});
export type CreateAssessmentResponse = z.infer<typeof CreateAssessmentResponseSchema>;
