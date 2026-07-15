import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

let app: FastifyInstance;

const cfg = () => loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local' });

/** Register a user and return their dev session token. */
async function registerUser(email: string): Promise<{ token: string; userId: string }> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email, firstName: 'Test', lastName: 'User' },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json();
  return { token: body.session.accessToken, userId: body.me.id };
}

beforeAll(async () => {
  app = await buildApp(cfg());
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe('registration & session', () => {
  it('registers a user and returns a dev session + profile', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'alice@example.com', firstName: 'Alice' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.me.email).toBe('alice@example.com');
    expect(body.me.onboardingComplete).toBe(false);
    expect(body.me.profile.firstName).toBe('Alice');
    expect(body.session.tokenType).toBe('Bearer');
  });

  it('register is idempotent by identity', async () => {
    await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'bob@example.com' } });
    const second = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'bob@example.com' },
    });
    expect(second.statusCode).toBe(201);
  });

  it('issues a session for an existing email', async () => {
    await registerUser('carol@example.com');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/session',
      payload: { email: 'carol@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTruthy();
  });
});

describe('authentication guards', () => {
  it('rejects /v1/me without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: { code: 'unauthenticated' } });
  });

  it('rejects a garbage token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns the current user with a valid token', async () => {
    const { token } = await registerUser('dave@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe('dave@example.com');
  });
});

describe('onboarding flow → onboardingComplete flips true', () => {
  it('completes after minimum profile + required consents', async () => {
    const { token } = await registerUser('erin@example.com');
    const auth = { authorization: `Bearer ${token}` };

    // Minimum profile (dob + sex).
    const p = await app.inject({
      method: 'PATCH',
      url: '/v1/me/profile',
      headers: auth,
      payload: { dateOfBirth: '1990-05-01', sexAtBirth: 'female' },
    });
    expect(p.statusCode).toBe(200);

    // Required consents.
    for (const scope of ['hipaa_notice', 'terms_of_service']) {
      const c = await app.inject({
        method: 'POST',
        url: '/v1/consents',
        headers: auth,
        payload: { scope, version: '1.0' },
      });
      expect(c.statusCode).toBe(201);
    }

    const me = await app.inject({ method: 'GET', url: '/v1/me', headers: auth });
    expect(me.json().onboardingComplete).toBe(true);
  });

  it('can revoke a consent', async () => {
    const { token } = await registerUser('frank@example.com');
    const auth = { authorization: `Bearer ${token}` };
    await app.inject({
      method: 'POST',
      url: '/v1/consents',
      headers: auth,
      payload: { scope: 'ai_processing', version: '1.0' },
    });
    const del = await app.inject({
      method: 'DELETE',
      url: '/v1/consents/ai_processing',
      headers: auth,
    });
    expect(del.statusCode).toBe(204);
    const list = await app.inject({ method: 'GET', url: '/v1/consents', headers: auth });
    const ai = list.json().find((c: { scope: string }) => c.scope === 'ai_processing');
    expect(ai.granted).toBe(false);
  });

  it('rejects an invalid profile field with a validation envelope', async () => {
    const { token } = await registerUser('grace@example.com');
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/me/profile',
      headers: { authorization: `Bearer ${token}` },
      payload: { heightCm: -5 },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ error: { code: 'validation' } });
  });
});
