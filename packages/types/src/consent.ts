import { z } from 'zod';
import { TimestampSchema } from './common.js';

/**
 * Consent scopes gate what data may be processed/shared (see docs/03 §3.8, docs/06).
 * Base scopes are enumerated; parameterized scopes use a `prefix:param` form:
 *   - device:<vendor>          e.g. device:apple_health
 *   - share:provider:<id>      e.g. share:provider:<uuid>
 */
export const BASE_CONSENT_SCOPES = [
  'hipaa_notice',
  'terms_of_service',
  'ai_processing',
  'ads_contextual',
] as const;

const baseScope = z.enum(BASE_CONSENT_SCOPES);
const parameterizedScope = z
  .string()
  .regex(
    /^(device:[a-z_]+|share:provider:[0-9a-f-]{36})$/,
    'Unknown consent scope format',
  );

export const ConsentScopeSchema = z.union([baseScope, parameterizedScope]);
export type ConsentScope = z.infer<typeof ConsentScopeSchema>;

/** Scopes a user MUST grant to finish onboarding (HIPAA notice + ToS). */
export const REQUIRED_ONBOARDING_SCOPES: ConsentScope[] = ['hipaa_notice', 'terms_of_service'];

export const ConsentSchema = z.object({
  scope: ConsentScopeSchema,
  granted: z.boolean(),
  version: z.string(),
  grantedAt: TimestampSchema.nullable(),
  revokedAt: TimestampSchema.nullable(),
});
export type Consent = z.infer<typeof ConsentSchema>;

export const GrantConsentSchema = z.object({
  scope: ConsentScopeSchema,
  version: z.string().min(1).max(50),
});
export type GrantConsent = z.infer<typeof GrantConsentSchema>;
