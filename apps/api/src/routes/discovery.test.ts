import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

let app: FastifyInstance;
let auth: { authorization: string };

beforeAll(async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local' }));
  await app.ready();
  const reg = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'dx@example.com' } });
  auth = { authorization: `Bearer ${reg.json().session.accessToken}` };
});
afterAll(async () => {
  await app.close();
});

describe('self-diagnosis assessments', () => {
  it('produces a non-diagnostic assessment with a disclaimer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/assessments',
      headers: auth,
      payload: { symptoms: ['headache', 'tired'] },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.emergency).toBeNull();
    expect(body.assessment.disclaimerShown).toBe(true);
    expect(body.assessment.result.possibilities.length).toBeGreaterThan(0);
    expect(['self_care', 'consult_soon', 'consult_urgent']).toContain(body.assessment.result.triage);
  });

  it('SAFETY GATE: emergency symptoms short-circuit the medical engine', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/assessments',
      headers: auth,
      payload: { symptoms: ['crushing chest pain', 'sweating'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.assessment).toBeNull();
    expect(body.emergency.actions).toContain('call_911');
  });

  it('lists and shares an assessment', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/assessments',
      headers: auth,
      payload: { symptoms: ['cough', 'fever'] },
    });
    const id = create.json().assessment.id;

    const share = await app.inject({ method: 'POST', url: `/v1/assessments/${id}/share`, headers: auth });
    expect(share.statusCode).toBe(200);
    expect(share.json().shareable).toBe(true);

    const list = await app.inject({ method: 'GET', url: '/v1/assessments', headers: auth });
    expect(list.json().items.some((a: { id: string }) => a.id === id)).toBe(true);
  });

  it('cannot read another users assessment', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/assessments',
      headers: auth,
      payload: { symptoms: ['headache'] },
    });
    const id = create.json().assessment.id;
    const other = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'dx-intruder@example.com' } });
    const otherAuth = { authorization: `Bearer ${other.json().session.accessToken}` };
    const res = await app.inject({ method: 'GET', url: `/v1/assessments/${id}`, headers: otherAuth });
    expect(res.statusCode).toBe(403);
  });
});

describe('provider discovery', () => {
  it('searches providers and filters by type', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/providers/search?type=mental_health', headers: auth });
    expect(res.statusCode).toBe(200);
    const items = res.json().items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p: { type: string }) => p.type === 'mental_health')).toBe(true);
  });

  it('surfaces affordable options for underinsured users', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/providers/search', headers: auth });
    const items = res.json().items;
    expect(items.some((p: { affordableOption: boolean }) => p.affordableOption)).toBe(true);
  });
});
