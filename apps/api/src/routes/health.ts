import type { FastifyInstance } from 'fastify';

// Injected by the build (see Dockerfile / CI). Falls back to 'dev'.
const VERSION = process.env.APP_VERSION ?? 'dev';
const COMMIT = process.env.APP_COMMIT ?? 'local';

/**
 * Liveness/readiness + version. Non-PHI, unauthenticated.
 * In later milestones `/health` will also check DB/Redis readiness.
 */
export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  app.get('/version', async () => ({
    version: VERSION,
    commit: COMMIT,
    node: process.version,
  }));
}
