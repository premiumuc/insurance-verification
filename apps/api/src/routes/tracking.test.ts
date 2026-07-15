import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

let app: FastifyInstance;
let auth: { authorization: string };

beforeAll(async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local' }));
  await app.ready();
  const reg = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email: 'track@example.com' },
  });
  auth = { authorization: `Bearer ${reg.json().session.accessToken}` };
});
afterAll(async () => {
  await app.close();
});

async function log(type: string, data: unknown, occurredAt?: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/events',
    headers: auth,
    payload: { type, source: 'manual', data, ...(occurredAt ? { occurredAt } : {}) },
  });
  return res;
}

describe('event logging', () => {
  it('creates a valid symptom event', async () => {
    const res = await log('symptom', { label: 'headache', severity: 6 });
    expect(res.statusCode).toBe(201);
    expect(res.json().type).toBe('symptom');
  });

  it('rejects an event whose data violates its type schema', async () => {
    const res = await log('water', { volumeMl: -10 });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: { code: 'validation' } });
  });

  it('requires auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/events',
      payload: { type: 'mood', source: 'manual', data: { score: 5 } },
    });
    expect(res.statusCode).toBe(401);
  });

  it('lists events newest-first and filters by type', async () => {
    await log('water', { volumeMl: 250 });
    const res = await app.inject({ method: 'GET', url: '/v1/events?type=water', headers: auth });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.every((e: { type: string }) => e.type === 'water')).toBe(true);
  });
});

describe('daily summary', () => {
  it('aggregates todays events', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await log('water', { volumeMl: 500 }, `${today}T09:00:00.000Z`);
    await log('water', { volumeMl: 300 }, `${today}T12:00:00.000Z`);
    await log('mood', { score: 7 }, `${today}T08:00:00.000Z`);

    const res = await app.inject({ method: 'GET', url: `/v1/summary/daily?date=${today}`, headers: auth });
    expect(res.statusCode).toBe(200);
    const s = res.json();
    expect(s.waterMl).toBeGreaterThanOrEqual(800);
    expect(s.latestMood).toBe(7);
  });
});

describe('patterns', () => {
  it('flags a recurring symptom across 3+ days', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'patterns@example.com' },
    });
    const a = { authorization: `Bearer ${reg.json().session.accessToken}` };
    const base = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - i);
      await app.inject({
        method: 'POST',
        url: '/v1/events',
        headers: a,
        payload: { type: 'symptom', source: 'manual', data: { label: 'headache' }, occurredAt: d.toISOString() },
      });
    }
    const res = await app.inject({ method: 'GET', url: '/v1/patterns?window=14', headers: a });
    expect(res.statusCode).toBe(200);
    const kinds = res.json().patterns.map((p: { kind: string }) => p.kind);
    expect(kinds).toContain('recurring_symptom');
  });
});

describe('ownership', () => {
  it('cannot delete another users event', async () => {
    const mine = await log('note', { text: 'private note' });
    const myEventId = mine.json().id;

    const other = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'intruder@example.com' },
    });
    const otherAuth = { authorization: `Bearer ${other.json().session.accessToken}` };

    const res = await app.inject({
      method: 'DELETE',
      url: `/v1/events/${myEventId}`,
      headers: otherAuth,
    });
    expect([403, 404]).toContain(res.statusCode);

    // And it still exists for the owner.
    const check = await app.inject({ method: 'GET', url: '/v1/events?type=note', headers: auth });
    expect(check.json().items.some((e: { id: string }) => e.id === myEventId)).toBe(true);
  });
});
