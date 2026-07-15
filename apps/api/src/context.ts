import type { AppConfig } from './config.js';
import { CognitoTokenVerifier } from './auth/cognito.js';
import { LocalTokenService } from './auth/local.js';
import type { TokenIssuer, TokenVerifier } from './auth/types.js';
import { createMemoryRepositories } from './db/memory.js';
import type { Repositories } from './db/repositories.js';
import { AuditService } from './services/audit.js';
import { ConsentService } from './services/consent.js';
import { IdentityService } from './services/identity.js';
import { TrackingService } from './services/tracking.js';

/**
 * Application context: the composition root. Everything a route needs is assembled here
 * once and shared. Swapping the repository or auth implementation is a change in this
 * one file — routes and services are unaffected (clean architecture, docs/05).
 */
export interface AppContext {
  config: AppConfig;
  repos: Repositories;
  verifier: TokenVerifier;
  /** Present only in local/dev auth mode. */
  issuer: TokenIssuer | null;
  identity: IdentityService;
  consent: ConsentService;
  tracking: TrackingService;
  audit: AuditService;
}

export interface BuildContextOptions {
  /** Override repositories (e.g. Postgres in prod, or a seeded set in tests). */
  repos?: Repositories;
}

export function buildContext(config: AppConfig, opts: BuildContextOptions = {}): AppContext {
  const repos = opts.repos ?? createMemoryRepositories();

  let verifier: TokenVerifier;
  let issuer: TokenIssuer | null = null;

  if (config.AUTH_MODE === 'cognito') {
    verifier = new CognitoTokenVerifier({
      region: config.AWS_REGION!,
      userPoolId: config.COGNITO_USER_POOL_ID!,
      clientId: config.COGNITO_CLIENT_ID!,
    });
  } else {
    const local = new LocalTokenService(config.LOCAL_JWT_SECRET);
    verifier = local;
    issuer = local;
  }

  return {
    config,
    repos,
    verifier,
    issuer,
    identity: new IdentityService(repos),
    consent: new ConsentService(repos),
    tracking: new TrackingService(repos.events),
    audit: new AuditService(repos.audit),
  };
}

// Make the context available on the Fastify instance and requests.
declare module 'fastify' {
  interface FastifyInstance {
    ctx: AppContext;
  }
}
