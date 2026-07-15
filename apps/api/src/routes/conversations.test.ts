import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';

let app: FastifyInstance;
let auth: { authorization: string };

async function newConversation(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/v1/conversations', headers: auth, payload: {} });
  return res.json().id;
}

async function send(conversationId: string, content: string) {
  return app.inject({
    method: 'POST',
    url: `/v1/conversations/${conversationId}/messages`,
    headers: auth,
    payload: { content },
  });
}

beforeAll(async () => {
  app = await buildApp(
    loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', AUTH_MODE: 'local', CHAT_ENGINE: 'local' }),
  );
  await app.ready();
  const reg = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: { email: 'chat@example.com' },
  });
  auth = { authorization: `Bearer ${reg.json().session.accessToken}` };
});
afterAll(async () => {
  await app.close();
});

describe('conversational front door', () => {
  it('logs structured events extracted from a benign message', async () => {
    const convo = await newConversation();
    const res = await send(convo, 'I drank 500ml of water and slept 7 hours');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.emergency).toBeNull();
    expect(body.createdEventIds.length).toBeGreaterThanOrEqual(2);
    expect(body.message.role).toBe('assistant');

    // The extracted events show up in tracking.
    const events = await app.inject({ method: 'GET', url: '/v1/events', headers: auth });
    const types = events.json().items.map((e: { type: string }) => e.type);
    expect(types).toContain('water');
    expect(types).toContain('sleep');
  });

  it('SAFETY GATE: an emergency short-circuits before the engine — no events logged', async () => {
    const convo = await newConversation();
    const res = await send(convo, 'I have crushing chest pain radiating down my arm');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.emergency).not.toBeNull();
    expect(body.emergency.actions).toContain('call_911');
    expect(body.message.intent).toBe('emergency');
    expect(body.createdEventIds).toEqual([]); // engine never ran
  });

  it('records both the user and assistant messages in order', async () => {
    const convo = await newConversation();
    await send(convo, 'feeling good today');
    const res = await app.inject({
      method: 'GET',
      url: `/v1/conversations/${convo}/messages`,
      headers: auth,
    });
    const roles = res.json().items.map((m: { role: string }) => m.role);
    expect(roles[0]).toBe('user');
    expect(roles).toContain('assistant');
  });

  it('rejects access to another users conversation', async () => {
    const convo = await newConversation();
    const other = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'chat-intruder@example.com' },
    });
    const otherAuth = { authorization: `Bearer ${other.json().session.accessToken}` };
    const res = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${convo}/messages`,
      headers: otherAuth,
      payload: { content: 'hello' },
    });
    expect(res.statusCode).toBe(403);
  });
});
