import { ConsentScopeSchema, GrantConsentSchema } from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';

/** Consent management. Grants gate downstream data processing/sharing (docs/06). */
export async function registerConsentRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  app.get('/consents', { preHandler: app.authenticate }, async (req) => {
    return ctx.consent.list(req.user!.id);
  });

  app.post('/consents', { preHandler: app.authenticate }, async (req, reply) => {
    const user = req.user!;
    const input = GrantConsentSchema.parse(req.body);
    const consent = await ctx.consent.grant(user.id, input);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'update',
      resourceType: 'consent',
      resourceId: input.scope,
      purpose: 'grant_consent',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return reply.status(201).send(consent);
  });

  app.delete('/consents/:scope', { preHandler: app.authenticate }, async (req, reply) => {
    const user = req.user!;
    const scope = ConsentScopeSchema.parse((req.params as { scope: string }).scope);
    await ctx.consent.revoke(user.id, scope);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'update',
      resourceType: 'consent',
      resourceId: scope,
      purpose: 'revoke_consent',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return reply.status(204).send();
  });
}
