import { z } from 'zod';
import { HealthEventSchema, HealthEventTypeSchema } from './health-event.js';

/** Daily summary payload powering the Home "daily loop" and dashboard-at-a-glance. */
export const DailySummarySchema = z.object({
  date: z.string().date(),
  /** Map of event type → count for the day. */
  counts: z.record(z.string(), z.number()),
  waterMl: z.number().nonnegative(),
  sleepMinutes: z.number().nonnegative().nullable(),
  latestMood: z.number().int().min(0).max(10).nullable(),
  latestWeightKg: z.number().positive().nullable(),
  events: z.array(HealthEventSchema),
});
export type DailySummary = z.infer<typeof DailySummarySchema>;

/** A single detected pattern/observation (non-clinical). */
export const PatternSchema = z.object({
  id: z.string(),
  kind: z.enum(['recurring_symptom', 'low_hydration', 'short_sleep', 'mood_trend']),
  severity: z.enum(['info', 'suggestion']),
  message: z.string(),
  relatedType: HealthEventTypeSchema.nullable(),
});
export type Pattern = z.infer<typeof PatternSchema>;

export const PatternsResponseSchema = z.object({
  windowDays: z.number().int().positive(),
  patterns: z.array(PatternSchema),
});
export type PatternsResponse = z.infer<typeof PatternsResponseSchema>;
