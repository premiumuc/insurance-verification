import { PostMessageRequestSchema } from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CreateConversationSchema = z.object({ title: z.string().max(120).optional() });

/** Conversational front door (docs/04). The safety gate runs inside postMessage. */
export async function registerConversationRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  app.post('/conversations', { preHandler: app.authenticate }, async (req, reply) => {
    const { title } = CreateConversationSchema.parse(req.body ?? {});
    const convo = await ctx.conversation.create(req.user!.id, title);
    return reply.status(201).send({ id: convo.id, title: convo.title, createdAt: convo.createdAt });
  });

  app.get('/conversations', { preHandler: app.authenticate }, async (req) => {
    const list = await ctx.conversation.list(req.user!.id);
    return {
      items: list.map((c) => ({ id: c.id, title: c.title, lastMessageAt: c.lastMessageAt })),
      nextCursor: null,
    };
  });

  app.get('/conversations/:id/messages', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    return { items: await ctx.conversation.messages(req.user!.id, id) };
  });

  app.post('/conversations/:id/messages', { preHandler: app.authenticate }, async (req) => {
    const user = req.user!;
    const { id } = req.params as { id: string };
    const { content } = PostMessageRequestSchema.parse(req.body);

    const result = await ctx.conversation.postMessage(user, id, content);

    // Audit: a chat turn is a PHI write; emergencies are recorded distinctly.
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'create',
      resourceType: 'message',
      resourceId: id,
      purpose: result.emergency ? 'chat_emergency_escalation' : 'chat_message',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });

    return result;
  });
}
