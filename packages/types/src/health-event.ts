import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

/**
 * Health events — the polymorphic tracking record (see docs/03).
 * One table, typed `data` payload validated per `type`. Adding a trackable is a new
 * enum value + schema here, not a migration.
 */
export const HealthEventTypeSchema = z.enum([
  'symptom',
  'mood',
  'energy',
  'food',
  'water',
  'sleep',
  'weight',
  'body_metric',
  'menstrual',
  'substance',
  'sobriety',
  'note',
  'vitals',
]);
export type HealthEventType = z.infer<typeof HealthEventTypeSchema>;

export const HealthEventSourceSchema = z.enum(['chat', 'manual', 'device', 'import']);
export type HealthEventSource = z.infer<typeof HealthEventSourceSchema>;

/** 0–10 severity/intensity scale used across several event types. */
const ScaleSchema = z.number().int().min(0).max(10);

/** Per-type payload schemas. Discriminated by the event `type`. */
export const EventDataSchemas = {
  symptom: z.object({
    label: z.string().min(1),
    severity: ScaleSchema.optional(),
    bodyLocation: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
    note: z.string().optional(),
  }),
  mood: z.object({ score: ScaleSchema, label: z.string().optional(), note: z.string().optional() }),
  energy: z.object({ score: ScaleSchema, note: z.string().optional() }),
  food: z.object({
    description: z.string().min(1),
    calories: z.number().nonnegative().optional(),
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  }),
  water: z.object({ volumeMl: z.number().positive() }),
  sleep: z.object({
    durationMinutes: z.number().int().positive(),
    quality: ScaleSchema.optional(),
  }),
  weight: z.object({ kg: z.number().positive() }),
  body_metric: z.object({ metric: z.string().min(1), value: z.number(), unit: z.string() }),
  menstrual: z.object({
    flow: z.enum(['none', 'spotting', 'light', 'medium', 'heavy']).optional(),
    symptoms: z.array(z.string()).optional(),
  }),
  substance: z.object({ substance: z.string().min(1), amount: z.string().optional() }),
  sobriety: z.object({ dayCount: z.number().int().nonnegative().optional(), note: z.string().optional() }),
  note: z.object({ text: z.string().min(1) }),
  vitals: z.object({ metric: z.string().min(1), value: z.number(), unit: z.string() }),
} as const;

/** Full health event as returned by the API. */
export const HealthEventSchema = z.object({
  id: IdSchema,
  type: HealthEventTypeSchema,
  source: HealthEventSourceSchema,
  occurredAt: TimestampSchema,
  data: z.record(z.unknown()),
  confidence: z.number().min(0).max(1).nullable().optional(),
  createdAt: TimestampSchema,
});
export type HealthEvent = z.infer<typeof HealthEventSchema>;

/** Create payload — validates `data` against the schema for the given `type`. */
export const CreateHealthEventSchema = z
  .object({
    type: HealthEventTypeSchema,
    source: HealthEventSourceSchema.default('manual'),
    occurredAt: TimestampSchema.optional(),
    data: z.record(z.unknown()),
  })
  .superRefine((val, ctx) => {
    const schema = EventDataSchemas[val.type];
    const parsed = schema.safeParse(val.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: ['data', ...issue.path] });
      }
    }
  });
export type CreateHealthEvent = z.infer<typeof CreateHealthEventSchema>;
