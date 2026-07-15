import { RegisterRequestSchema, SessionRequestSchema } from '@healthy-companion/types';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError } from '../errors.js';

/**
 * Auth & account provisioning.
 *
 * Production: the client authenticates with Cognito and calls POST /auth/register with
 * the resulting bearer token; we read the verified `sub` and provision the app-side user.
 * Dev/local: no Cognito — register derives a deterministic local sub from the email and
 * /auth/session mints a dev token so the stack is runnable and testable end-to-end.
 */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;

  async function resolveSub(req: FastifyRequest, email: string): Promise<string> {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const principal = await ctx.verifier.verify(header.slice(7).trim());
      return principal.sub;
    }
    if (ctx.issuer) return `local:${email.toLowerCase()}`; // dev path
    throw AppError.unauthenticated('A Cognito token is required to register');
  }

  app.post('/auth/register', async (req, reply) => {
    const body = RegisterRequestSchema.parse(req.body);
    const sub = await resolveSub(req, body.email);

    const user = await ctx.identity.register(sub, body);
    await ctx.audit.record({
      actorUserId: user.id,
      subjectUserId: user.id,
      action: 'create',
      resourceType: 'user',
      resourceId: user.id,
      purpose: 'account_registration',
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });

    const me = await ctx.identity.getMe(user);
    // Dev convenience: hand back a session token so local clients can proceed.
    const session = ctx.issuer
      ? {
          accessToken: await ctx.issuer.issue(
            { sub: user.cognitoSub, role: user.role, orgId: user.orgId },
            ctx.config.SESSION_TTL_SECONDS,
          ),
          tokenType: 'Bearer' as const,
          expiresIn: ctx.config.SESSION_TTL_SECONDS,
        }
      : null;

    return reply.status(201).send({ me, session });
  });

  // Dev/local only. In production, tokens come from Cognito.
  app.post('/auth/session', async (req, reply) => {
    if (!ctx.issuer) {
      throw AppError.forbidden('Sessions are issued by Cognito in this environment');
    }
    const body = SessionRequestSchema.parse(req.body);
    const user = await ctx.repos.users.findByEmail(body.email);
    if (!user || user.status === 'deleted') throw AppError.notFound('No account for that email');

    const accessToken = await ctx.issuer.issue(
      { sub: user.cognitoSub, role: user.role, orgId: user.orgId },
      ctx.config.SESSION_TTL_SECONDS,
    );
    return reply.send({
      accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: ctx.config.SESSION_TTL_SECONDS,
    });
  });
}
