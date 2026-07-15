import { z } from 'zod';
import { IdSchema, RoleSchema, TimestampSchema } from './common.js';
import { ConsentSchema } from './consent.js';
import { ProfileSchema } from './profile.js';

/**
 * Auth + account payloads (see docs/04 §Auth & account).
 *
 * Production auth is delegated to Amazon Cognito — the app authenticates against
 * Cognito and sends the resulting JWT. `register` provisions the app-side user/profile
 * after a Cognito sign-up. In local/dev mode a shim issues a token so the stack runs
 * without AWS (see apps/api/src/auth).
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

/** Dev/local session request — production clients obtain tokens from Cognito directly. */
export const SessionRequestSchema = z.object({
  email: z.string().email(),
});
export type SessionRequest = z.infer<typeof SessionRequestSchema>;

export const SessionResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

/** The authenticated principal decoded from a verified token. */
export const PrincipalSchema = z.object({
  sub: z.string(), // Cognito sub (or local dev sub)
  role: RoleSchema,
  orgId: IdSchema.nullable(),
});
export type Principal = z.infer<typeof PrincipalSchema>;

/** GET /v1/me — current user with profile + consents summary + onboarding state. */
export const MeResponseSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  role: RoleSchema,
  orgId: IdSchema.nullable(),
  onboardingComplete: z.boolean(),
  profile: ProfileSchema,
  consents: z.array(ConsentSchema),
  createdAt: TimestampSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
