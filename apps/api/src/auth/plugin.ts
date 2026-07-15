import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Principal } from '@healthy-companion/types';
import type { UserRecord } from '../db/models.js';
import { AppError } from '../errors.js';

/**
 * Auth plugin: decorates requests with `authenticate` (a preHandler) that verifies the
 * bearer token, resolves the app-side user, and populates `req.principal` / `req.user`.
 *
 * Ownership is enforced at the route level via `req.requireOwnership(userId)` — the
 * single choke point that prevents broken-object-level-authorization (threat T1, docs/06).
 */
declare module 'fastify' {
  interface FastifyRequest {
    principal: Principal | null;
    user: UserRecord | null;
    /** Throws unless the authenticated user owns `ownerUserId` (admins bypass). */
    requireOwnership(ownerUserId: string): void;
  }
  interface FastifyInstance {
    authenticate(req: FastifyRequest): Promise<void>;
  }
}

function extractBearer(header: string | undefined): string {
  if (!header?.startsWith('Bearer ')) throw AppError.unauthenticated();
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw AppError.unauthenticated();
  return token;
}

export const authPlugin = fp(
  async (app) => {
    app.decorateRequest('principal', null);
    app.decorateRequest('user', null);

    app.decorateRequest('requireOwnership', function (this: FastifyRequest, ownerUserId: string) {
      const u = this.user;
      if (!u) throw AppError.unauthenticated();
      if (u.role === 'admin') return;
      if (u.id !== ownerUserId) throw AppError.forbidden();
    });

    app.decorate('authenticate', async function (req: FastifyRequest) {
      const token = extractBearer(req.headers.authorization);
      const principal = await app.ctx.verifier.verify(token);

      const user = await app.ctx.identity.getUserByCognitoSub(principal.sub);
      if (!user || user.status === 'deleted') {
        // Authenticated with a valid token but no active app-side account.
        throw AppError.unauthenticated('Account not provisioned');
      }
      req.principal = principal;
      req.user = user;
    });
  },
  { name: 'auth' },
);
