import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

let app: FastifyInstance;
let auth: { authorization: string };
let userId: string;

beforeAll(async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local' }));
  await app.ready();
  const reg = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'dev@example.com' } });
  auth = { authorization: `Bearer ${reg.json().session.accessToken}` };
  userId = reg.json().me.id;
});
afterAll(async () => {
  await app.close();
});

describe('device connections', () => {
  it('connects an on-device source without an auth url', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/devices/connect',
      headers: auth,
      payload: { vendor: 'apple_health' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().authUrl).toBeNull();
    expect(res.json().device.status).toBe('connected');
  });

  it('connects an aggregator source and returns an auth url', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/devices/connect',
      headers: auth,
      payload: { vendor: 'oura' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().authUrl).toContain('connect/oura');
  });
});

describe('metric ingestion + query', () => {
  it('ingests on-device samples and queries a daily series', async () => {
    const samples = [
      { metric: 'steps', value: 4000, unit: 'count', ts: '2026-07-10T10:00:00.000Z' },
      { metric: 'steps', value: 6000, unit: 'count', ts: '2026-07-10T18:00:00.000Z' },
      { metric: 'steps', value: 8000, unit: 'count', ts: '2026-07-11T18:00:00.000Z' },
    ];
    const sync = await app.inject({
      method: 'POST',
      url: '/v1/devices/sync',
      headers: auth,
      payload: { vendor: 'apple_health', samples },
    });
    expect(sync.statusCode).toBe(200);
    expect(sync.json().ingested).toBe(3);

    const series = await app.inject({
      method: 'GET',
      url: '/v1/metrics?metric=steps&from=2026-07-01T00:00:00.000Z&to=2026-07-20T00:00:00.000Z&agg=daily',
      headers: auth,
    });
    const body = series.json();
    // Two days: 2026-07-10 (avg 5000) and 2026-07-11 (8000).
    expect(body.points).toHaveLength(2);
    expect(body.points[0].value).toBe(5000);
  });

  it('ingests via the aggregator webhook', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/terra',
      payload: {
        externalAccountId: `mock-oura-${userId}`,
        samples: [{ metric: 'hrv', value: 55, unit: 'ms', ts: '2026-07-12T06:00:00.000Z' }],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ingested).toBe(1);
  });

  it('requires auth to query metrics', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/metrics?metric=steps' });
    expect(res.statusCode).toBe(401);
  });
});
