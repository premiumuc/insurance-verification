import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('health routes', () => {
  it('GET /v1/health → ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /v1/version → version info', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/version' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('version');
  });

  it('unknown route → uniform not_found envelope', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'not_found' } });
  });
});

describe('safety gate route', () => {
  it('escalates an emergency without erroring', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/safety/check',
      payload: { content: 'I have crushing chest pain and my arm hurts' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.escalate).toBe(true);
    expect(body.emergency).not.toBeNull();
    expect(body.emergency.actions).toContain('call_911');
  });

  it('does not escalate benign input', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/safety/check',
      payload: { content: 'logged a light lunch and drank water' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().escalate).toBe(false);
  });

  it('rejects invalid body with validation envelope', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/safety/check', payload: {} });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: { code: 'validation' } });
  });
});
