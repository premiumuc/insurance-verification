import type { Principal } from '@healthy-companion/types';

export type { Principal };

/**
 * Verifies a bearer token and returns the authenticated principal, or throws.
 * Two implementations exist behind this interface:
 *  - CognitoTokenVerifier (production): RS256 against the Cognito JWKS.
 *  - LocalTokenVerifier (dev/test): HS256 with a shared secret.
 */
export interface TokenVerifier {
  verify(token: string): Promise<Principal>;
}

/** Dev-only token issuer. Not available in production (Cognito issues tokens there). */
export interface TokenIssuer {
  issue(principal: Principal, ttlSeconds: number): Promise<string>;
}
