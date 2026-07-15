import { SignJWT, jwtVerify } from 'jose';
import type { Principal } from '@healthy-companion/types';
import { PrincipalSchema } from '@healthy-companion/types';
import { AppError } from '../errors.js';
import type { TokenIssuer, TokenVerifier } from './types.js';

/**
 * Dev/test auth shim (HS256). Lets the whole stack run and be tested without AWS.
 * MUST NOT be enabled in production — the app config refuses `auth_mode=local` there.
 */
export class LocalTokenService implements TokenVerifier, TokenIssuer {
  private readonly key: Uint8Array;
  private static readonly ISSUER = 'healthy-companion-local';

  constructor(secret: string) {
    this.key = new TextEncoder().encode(secret);
  }

  async issue(principal: Principal, ttlSeconds: number): Promise<string> {
    return new SignJWT({ role: principal.role, orgId: principal.orgId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(principal.sub)
      .setIssuer(LocalTokenService.ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${ttlSeconds}s`)
      .sign(this.key);
  }

  async verify(token: string): Promise<Principal> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: LocalTokenService.ISSUER,
      });
      const parsed = PrincipalSchema.safeParse({
        sub: payload.sub,
        role: payload.role,
        orgId: payload.orgId ?? null,
      });
      if (!parsed.success) throw AppError.unauthenticated('Malformed token claims');
      return parsed.data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthenticated('Invalid or expired token');
    }
  }
}
