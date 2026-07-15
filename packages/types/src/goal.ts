import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

/** Goals across the wellness dimensions the concept lists (docs/03 §3.8). */
export const GoalTypeSchema = z.enum([
  'weight',
  'nutrition',
  'fitness',
  'sleep',
  'hydration',
  'sobriety',
]);
export type GoalType = z.infer<typeof GoalTypeSchema>;

export const GoalSchema = z.object({
  id: IdSchema,
  type: GoalTypeSchema,
  title: z.string(),
  target: z.number(),
  unit: z.string(),
  current: z.number(),
  status: z.enum(['active', 'achieved', 'archived']),
  createdAt: TimestampSchema,
});
export type Goal = z.infer<typeof GoalSchema>;

export const CreateGoalSchema = z.object({
  type: GoalTypeSchema,
  title: z.string().min(1).max(120),
  target: z.number(),
  unit: z.string().min(1).max(20),
});
export type CreateGoal = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = z
  .object({
    current: z.number(),
    status: z.enum(['active', 'achieved', 'archived']),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;
