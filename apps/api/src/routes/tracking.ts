import {
  CreateHealthEventSchema,
  HealthEventTypeSchema,
} from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors.js';

const ListQuerySchema = z.object({
  type: HealthEventTypeSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const UpdateEventSchema = z
  .object({
    data: z.record(z.unknown()),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const DateQuerySchema = z.object({
  date: z.string().date().optional(),
});

const PatternsQuerySchema = z.object({
  window: z.coerce.number().int().min(1).max(90).default(14),
});

/** Health-event tracking + dashboard-feeding views. Every handler authenticates + audits. */
export async function registerTrackingRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  app.post('/events', { preHandler: app.authenticate }, async (req, reply) => {
    const user = req.user!;
    const input = CreateHealthEventSchema.parse(req.body);
    const event = await ctx.tracking.create(user.id, input);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'create',
      resourceType: 'health_event',
      resourceId: event.id,
      purpose: 'log_health_event',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return reply.status(201).send(event);
  });

  app.get('/events', { preHandler: app.authenticate }, async (req) => {
    const user = req.user!;
    const q = ListQuerySchema.parse(req.query);
    const page = await ctx.tracking.list(user.id, q);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'read',
      resourceType: 'health_event',
      purpose: 'view_history',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return page;
  });

  app.patch('/events/:id', { preHandler: app.authenticate }, async (req) => {
    const user = req.user!;
    const { id } = req.params as { id: string };
    const patch = UpdateEventSchema.parse(req.body);
    const event = await ctx.tracking.update(user.id, id, patch);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'update',
      resourceType: 'health_event',
      resourceId: id,
      purpose: 'edit_health_event',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return event;
  });

  app.delete('/events/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const user = req.user!;
    const { id } = req.params as { id: string };
    await ctx.tracking.remove(user.id, id);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'delete',
      resourceType: 'health_event',
      resourceId: id,
      purpose: 'delete_health_event',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return reply.status(204).send();
  });

  app.get('/summary/daily', { preHandler: app.authenticate }, async (req) => {
    const user = req.user!;
    const { date } = DateQuerySchema.parse(req.query);
    const dateISO = date ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) throw AppError.validation('Invalid date');
    return ctx.tracking.dailySummary(user.id, dateISO);
  });

  app.get('/patterns', { preHandler: app.authenticate }, async (req) => {
    const user = req.user!;
    const { window } = PatternsQuerySchema.parse(req.query);
    return ctx.tracking.patterns(user.id, window);
  });
}
