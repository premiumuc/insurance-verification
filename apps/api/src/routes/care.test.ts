import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

let app: FastifyInstance;
let auth: { authorization: string };

beforeAll(async () => {
  app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local' }));
  await app.ready();
  const reg = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'care@example.com' } });
  auth = { authorization: `Bearer ${reg.json().session.accessToken}` };
});
afterAll(async () => {
  await app.close();
});

describe('medications & reminders', () => {
  it('creates a medication and seeds today reminders', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/v1/medications',
      headers: auth,
      payload: { name: 'Metformin', dosage: '500mg', schedule: { times: ['08:00', '20:00'] }, conditionTag: 'diabetes' },
    });
    expect(create.statusCode).toBe(201);

    const today = new Date().toISOString().slice(0, 10);
    const reminders = await app.inject({
      method: 'GET',
      url: `/v1/medications/reminders?date=${today}`,
      headers: auth,
    });
    const list = reminders.json();
    expect(list.length).toBe(2);
    expect(list[0].medicationName).toBe('Metformin');
    expect(list[0].status).toBe('pending');
  });

  it('marks a reminder as taken', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const reminders = await app.inject({ method: 'GET', url: `/v1/medications/reminders?date=${today}`, headers: auth });
    const id = reminders.json()[0].id;
    const res = await app.inject({
      method: 'POST',
      url: `/v1/medications/reminders/${id}/respond`,
      headers: auth,
      payload: { status: 'taken' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('taken');
    expect(res.json().respondedAt).not.toBeNull();
  });

  it('rejects an invalid schedule time', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/medications',
      headers: auth,
      payload: { name: 'Bad', schedule: { times: ['25:99'] } },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe('appointments & visit summary', () => {
  it('creates an appointment and exports a visit summary', async () => {
    // Seed some context.
    await app.inject({
      method: 'POST',
      url: '/v1/events',
      headers: auth,
      payload: { type: 'symptom', source: 'manual', data: { label: 'fatigue' } },
    });

    const appt = await app.inject({
      method: 'POST',
      url: '/v1/appointments',
      headers: auth,
      payload: { title: 'Endocrinology follow-up', providerName: 'Dr. Lee', startsAt: '2026-08-01T15:00:00.000Z' },
    });
    expect(appt.statusCode).toBe(201);
    const id = appt.json().id;

    const summary = await app.inject({
      method: 'GET',
      url: `/v1/appointments/${id}/visit-summary`,
      headers: auth,
    });
    expect(summary.statusCode).toBe(200);
    const s = summary.json();
    expect(s.appointment.title).toBe('Endocrinology follow-up');
    expect(s.activeMedications.some((m: { name: string }) => m.name === 'Metformin')).toBe(true);
    expect(s.recentSymptoms.some((sym: { label: string }) => sym.label === 'fatigue')).toBe(true);
  });

  it('cannot read another users visit summary', async () => {
    const appt = await app.inject({
      method: 'POST',
      url: '/v1/appointments',
      headers: auth,
      payload: { title: 'Private', startsAt: '2026-08-02T15:00:00.000Z' },
    });
    const id = appt.json().id;

    const other = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'care-intruder@example.com' } });
    const otherAuth = { authorization: `Bearer ${other.json().session.accessToken}` };
    const res = await app.inject({ method: 'GET', url: `/v1/appointments/${id}/visit-summary`, headers: otherAuth });
    expect(res.statusCode).toBe(403);
  });
});
