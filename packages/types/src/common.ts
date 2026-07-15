import { z } from 'zod';

/** Opaque resource identifier (UUID v4). Never encode PHI in IDs. */
export const IdSchema = z.string().uuid();
export type Id = z.infer<typeof IdSchema>;

/** RFC3339 timestamp, timezone-aware. */
export const TimestampSchema = z.string().datetime({ offset: true });
export type Timestamp = z.infer<typeof TimestampSchema>;

/** User roles — two-sided-ready from day one (see docs/01). */
export const RoleSchema = z.enum(['user', 'provider', 'admin']);
export type Role = z.infer<typeof RoleSchema>;

/** Uniform API error envelope. Codes are stable and client-switchable. */
export const ErrorCodeSchema = z.enum([
  'unauthenticated',
  'forbidden',
  'not_found',
  'validation',
  'conflict',
  'rate_limited',
  'emergency_escalation',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Cursor pagination envelope. */
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}
