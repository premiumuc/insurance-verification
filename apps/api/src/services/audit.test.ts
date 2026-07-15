import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createMemoryRepositories } from '../db/memory.js';
import type { Repositories } from '../db/repositories.js';

let app: FastifyInstance;
let repos: Repositories;

beforeAll(async () => {
  repos = createMemoryRepositories();
  app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local' }), {
    repos,
  });
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('audit trail (HIPAA §164.312(b))', () => {
  it('writes an audit record for registration and for every PHI read/update', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'audit@example.com' },
    });
    const { me, session } = reg.json();
    const auth = { authorization: `Bearer ${session.accessToken}` };

    await app.inject({ method: 'GET', url: '/v1/me', headers: auth });
    await app.inject({
      method: 'PATCH',
      url: '/v1/me/profile',
      headers: auth,
      payload: { sexAtBirth: 'male' },
    });

    const trail = await repos.audit.listBySubject(me.id);
    const actions = trail.map((r) => `${r.action}:${r.resourceType}`);
    expect(actions).toContain('create:user');
    expect(actions).toContain('read:me');
    expect(actions).toContain('update:profile');
    // Audit is append-only — never fewer than the operations performed.
    expect(trail.length).toBeGreaterThanOrEqual(3);
  });
});
