import { CreateGoalSchema, UpdateGoalSchema } from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';

/** Wellness goals (docs/03 §3.8). */
export async function registerGoalRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  app.get('/goals', { preHandler: app.authenticate }, async (req) => {
    return { items: await ctx.goals.list(req.user!.id) };
  });

  app.post('/goals', { preHandler: app.authenticate }, async (req, reply) => {
    const input = CreateGoalSchema.parse(req.body);
    const goal = await ctx.goals.create(req.user!.id, input);
    return reply.status(201).send(goal);
  });

  app.patch('/goals/:id', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const patch = UpdateGoalSchema.parse(req.body);
    return ctx.goals.update(req.user!.id, id, patch);
  });
}
