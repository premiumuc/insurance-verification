import { z } from 'zod';

/**
 * Environment configuration, validated at boot. The process refuses to start with an
 * invalid config — fail fast rather than misbehave in production.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  // --- Auth ---
  // 'local' is a dev/test shim (HS256). 'cognito' is production (RS256 via JWKS).
  AUTH_MODE: z.enum(['local', 'cognito']).default('local'),
  LOCAL_JWT_SECRET: z.string().min(16).default('dev-only-insecure-secret-change-me'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  // Required when AUTH_MODE=cognito (validated below).
  AWS_REGION: z.string().optional(),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
})
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' || env.AUTH_MODE === 'cognito',
    { message: 'AUTH_MODE=local is forbidden in production', path: ['AUTH_MODE'] },
  )
  .refine(
    (env) =>
      env.AUTH_MODE !== 'cognito' ||
      (env.AWS_REGION && env.COGNITO_USER_POOL_ID && env.COGNITO_CLIENT_ID),
    {
      message: 'AUTH_MODE=cognito requires AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID',
      path: ['AUTH_MODE'],
    },
  );

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    // Print field errors (no secret values) and exit.
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
