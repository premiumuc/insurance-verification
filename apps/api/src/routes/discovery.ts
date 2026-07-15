import { CreateAssessmentSchema, ProviderTypeSchema } from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const ProviderSearchQuery = z.object({
  q: z.string().max(100).optional(),
  type: ProviderTypeSchema.optional(),
  insurance: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Self-diagnosis assessments + provider discovery (docs/04, docs/07). */
export async function registerDiscoveryRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  // --- Assessments ---
  app.post('/assessments', { preHandler: app.authenticate }, async (req, reply) => {
    const { symptoms } = CreateAssessmentSchema.parse(req.body);
    const result = await ctx.assessment.create(req.user!.id, symptoms);
    await ctx.audit.record({
      actorUserId: req.user!.id,
      subjectUserId: req.user!.id,
      action: 'create',
      resourceType: 'assessment',
      resourceId: result.assessment?.id ?? null,
      purpose: result.emergency ? 'assessment_emergency_escalation' : 'self_assessment',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return reply.status(result.emergency ? 200 : 201).send(result);
  });

  app.get('/assessments', { preHandler: app.authenticate }, async (req) => {
    return { items: await ctx.assessment.list(req.user!.id) };
  });

  app.get('/assessments/:id', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    return ctx.assessment.get(req.user!.id, id);
  });

  app.post('/assessments/:id/share', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const assessment = await ctx.assessment.markShareable(req.user!.id, id);
    await ctx.audit.record({
      actorUserId: req.user!.id,
      subjectUserId: req.user!.id,
      action: 'share',
      resourceType: 'assessment',
      resourceId: id,
      purpose: 'share_assessment',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return assessment;
  });

  // --- Providers (directory data — not PHI, still requires auth) ---
  app.get('/providers/search', { preHandler: app.authenticate }, async (req) => {
    const q = ProviderSearchQuery.parse(req.query);
    return { items: await ctx.providers.search({ query: q.q, type: q.type, insurance: q.insurance, limit: q.limit }) };
  });

  app.get('/providers/:id', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    return ctx.providers.get(id);
  });
}
