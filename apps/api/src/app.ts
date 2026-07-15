import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { ApiError } from '@healthy-companion/types';
import { authPlugin } from './auth/plugin.js';
import { registerCareRoutes } from './routes/care.js';
import { registerDeviceRoutes } from './routes/devices.js';
import { registerDiscoveryRoutes } from './routes/discovery.js';
import { registerGoalRoutes } from './routes/goals.js';
import type { AppConfig } from './config.js';
import { buildContext, type BuildContextOptions } from './context.js';
import { AppError } from './errors.js';
import { createLoggerOptions } from './logger.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerConsentRoutes } from './routes/consents.js';
import { registerConversationRoutes } from './routes/conversations.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerMeRoutes } from './routes/me.js';
import { registerSafetyRoutes } from './routes/safety.js';
import { registerTrackingRoutes } from './routes/tracking.js';

/**
 * Build the Fastify app. Separated from server startup so tests can build an app
 * instance and call `.inject()` without opening a socket. `opts` lets tests inject
 * seeded repositories.
 */
export async function buildApp(
  config: AppConfig,
  opts: BuildContextOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: createLoggerOptions(config.LOG_LEVEL),
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,
  });

  // Composition root + auth.
  app.decorate('ctx', buildContext(config, opts));
  await app.register(authPlugin);

  // Security headers.
  await app.register(helmet, { global: true });

  // CORS — explicit allow-list only.
  await app.register(cors, {
    origin: config.CORS_ORIGINS.length > 0 ? config.CORS_ORIGINS : false,
    credentials: true,
  });

  // Baseline rate limiting (Redis-backed in prod; in-memory for now).
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  // Uniform error envelope for every thrown error.
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      const body: ApiError = {
        error: { code: err.code, message: err.message, details: err.details },
      };
      return reply.status(err.statusCode).send(body);
    }
    // Zod parse errors (thrown by .parse() in handlers) → 422 with field details.
    if (err instanceof ZodError) {
      const body: ApiError = {
        error: {
          code: 'validation',
          message: 'Validation failed',
          details: err.flatten().fieldErrors,
        },
      };
      return reply.status(422).send(body);
    }
    // Fastify schema validation errors → 422 without leaking internals.
    if ((err as { validation?: unknown }).validation) {
      const body: ApiError = {
        error: { code: 'validation', message: 'Validation failed' },
      };
      return reply.status(422).send(body);
    }
    const e = err as Error;
    req.log.error({ err: { name: e.name, message: e.message } }, 'unhandled_error');
    const body: ApiError = { error: { code: 'internal', message: 'Something went wrong' } };
    return reply.status(500).send(body);
  });

  app.setNotFoundHandler((_req, reply) => {
    const body: ApiError = { error: { code: 'not_found', message: 'Not found' } };
    return reply.status(404).send(body);
  });

  // Routes (v1).
  await app.register(registerHealthRoutes, { prefix: '/v1' });
  await app.register(registerSafetyRoutes, { prefix: '/v1' });
  await app.register(registerAuthRoutes, { prefix: '/v1' });
  await app.register(registerMeRoutes, { prefix: '/v1' });
  await app.register(registerConsentRoutes, { prefix: '/v1' });
  await app.register(registerTrackingRoutes, { prefix: '/v1' });
  await app.register(registerConversationRoutes, { prefix: '/v1' });
  await app.register(registerCareRoutes, { prefix: '/v1' });
  await app.register(registerDeviceRoutes, { prefix: '/v1' });
  await app.register(registerDiscoveryRoutes, { prefix: '/v1' });
  await app.register(registerGoalRoutes, { prefix: '/v1' });

  return app;
}
