import { UpdateProfileSchema } from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';

/** Current-user + profile routes. Every handler authenticates and audits PHI access. */
export async function registerMeRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  app.get('/me', { preHandler: app.authenticate }, async (req) => {
    const user = req.user!;
    const me = await ctx.identity.getMe(user);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'read',
      resourceType: 'me',
      resourceId: user.id,
      purpose: 'view_account',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return me;
  });

  app.patch('/me/profile', { preHandler: app.authenticate }, async (req) => {
    const user = req.user!;
    const patch = UpdateProfileSchema.parse(req.body);
    const profile = await ctx.identity.updateProfile(user.id, patch);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'update',
      resourceType: 'profile',
      resourceId: user.id,
      purpose: 'edit_profile',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return profile;
  });
}
