import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

let app: FastifyInstance;
let auth: { authorization: string };

beforeAll(async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local' }));
  await app.ready();
  const reg = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'goals@example.com' } });
  auth = { authorization: `Bearer ${reg.json().session.accessToken}` };
});
afterAll(async () => {
  await app.close();
});

describe('goals', () => {
  it('creates a goal and marks it achieved when the target is reached', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/goals',
      headers: auth,
      payload: { type: 'hydration', title: 'Drink 2L daily', target: 2000, unit: 'ml' },
    });
    expect(create.statusCode).toBe(201);
    const id = create.json().id;
    expect(create.json().status).toBe('active');

    const update = await app.inject({
      method: 'PATCH',
      url: `/v1/goals/${id}`,
      headers: auth,
      payload: { current: 2100 },
    });
    expect(update.json().status).toBe('achieved');
  });

  it('lists goals and blocks cross-user updates', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/goals',
      headers: auth,
      payload: { type: 'sleep', title: 'Sleep 8h', target: 8, unit: 'h' },
    });
    const id = create.json().id;

    const list = await app.inject({ method: 'GET', url: '/v1/goals', headers: auth });
    expect(list.json().items.length).toBeGreaterThanOrEqual(2);

    const other = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'goals-intruder@example.com' } });
    const otherAuth = { authorization: `Bearer ${other.json().session.accessToken}` };
    const res = await app.inject({ method: 'PATCH', url: `/v1/goals/${id}`, headers: otherAuth, payload: { current: 1 } });
    expect(res.statusCode).toBe(403);
  });
});
