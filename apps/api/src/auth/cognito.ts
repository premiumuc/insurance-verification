import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Principal } from '@healthy-companion/types';
import { RoleSchema } from '@healthy-companion/types';
import { AppError } from '../errors.js';
import type { TokenVerifier } from './types.js';

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
}

/**
 * Production token verifier: validates a Cognito-issued RS256 JWT against the pool's
 * published JWKS. The role claim is read from a custom Cognito attribute
 * (`custom:role`) and defaults to `user`.
 *
 * Cognito's JWKS is fetched and cached by `createRemoteJWKSet` (with rotation handling).
 */
export class CognitoTokenVerifier implements TokenVerifier {
  private readonly jwks: JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly clientId: string;

  constructor(config: CognitoConfig) {
    this.issuer = `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
    this.clientId = config.clientId;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async verify(token: string): Promise<Principal> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer });

      // Access tokens carry client_id; ID tokens carry aud. Accept the access token.
      if (payload.token_use !== 'access' || payload.client_id !== this.clientId) {
        throw AppError.unauthenticated('Unexpected token audience');
      }
      if (!payload.sub) throw AppError.unauthenticated('Token missing subject');

      const role = RoleSchema.catch('user').parse(payload['custom:role']);
      const orgId = typeof payload['custom:org_id'] === 'string' ? payload['custom:org_id'] : null;

      return { sub: payload.sub, role, orgId };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthenticated('Invalid or expired token');
    }
  }
}
