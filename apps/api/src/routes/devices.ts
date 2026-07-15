import { ConnectDeviceSchema, MetricNameSchema, SyncSamplesSchema } from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const MetricsQuery = z.object({
  metric: MetricNameSchema,
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  agg: z.enum(['raw', 'daily']).default('daily'),
});

/** Device connections + metric ingestion/query. */
export async function registerDeviceRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  app.get('/devices', { preHandler: app.authenticate }, async (req) => {
    return ctx.devices.list(req.user!.id);
  });

  app.post('/devices/connect', { preHandler: app.authenticate }, async (req, reply) => {
    const input = ConnectDeviceSchema.parse(req.body);
    const result = await ctx.devices.connect(req.user!.id, input);
    await ctx.audit.record({
      actorUserId: req.user!.id,
      subjectUserId: req.user!.id,
      action: 'create',
      resourceType: 'device_connection',
      resourceId: result.device.id,
      purpose: `connect_${input.vendor}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return reply.status(201).send(result);
  });

  app.delete('/devices/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await ctx.devices.disconnect(req.user!.id, id);
    return reply.status(204).send();
  });

  // On-device push (HealthKit / Health Connect batches).
  app.post('/devices/sync', { preHandler: app.authenticate }, async (req) => {
    const { vendor, samples } = SyncSamplesSchema.parse(req.body);
    const count = await ctx.devices.ingest(req.user!.id, vendor, samples);
    await ctx.audit.record({
      actorUserId: req.user!.id,
      subjectUserId: req.user!.id,
      action: 'create',
      resourceType: 'metric_sample',
      purpose: `sync_${vendor}`,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return { ingested: count };
  });

  // Aggregator webhook (unauthenticated; verified by signature in production).
  app.post('/webhooks/terra', async (req) => {
    const signature = req.headers['terra-signature'] as string | undefined;
    const count = await ctx.devices.ingestWebhook(signature, req.body);
    return { ingested: count };
  });

  app.get('/metrics', { preHandler: app.authenticate }, async (req) => {
    const q = MetricsQuery.parse(req.query);
    const to = q.to ?? new Date().toISOString();
    const from = q.from ?? new Date(Date.now() - 30 * 864e5).toISOString();
    return ctx.devices.series(req.user!.id, q.metric, from, to, q.agg);
  });
}
