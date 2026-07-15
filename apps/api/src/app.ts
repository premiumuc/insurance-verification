import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { ApiError } from '@healthy-companion/types';
import type { AppConfig } from './config.js';
import { AppError } from './errors.js';
import { createLoggerOptions } from './logger.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerSafetyRoutes } from './routes/safety.js';

/**
 * Build the Fastify app. Separated from server startup so tests can build an app
 * instance and call `.inject()` without opening a socket.
 */
export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: createLoggerOptions(config.LOG_LEVEL),
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,
  });

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
    // Fastify validation errors → 422 without leaking internals.
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

  return app;
}
