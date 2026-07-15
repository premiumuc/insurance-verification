import type { AppConfig } from './config.js';
import { CognitoTokenVerifier } from './auth/cognito.js';
import { LocalTokenService } from './auth/local.js';
import type { TokenIssuer, TokenVerifier } from './auth/types.js';
import { createMemoryRepositories } from './db/memory.js';
import type { Repositories } from './db/repositories.js';
import { BedrockChatEngine } from './ai/bedrock-engine.js';
import type { ChatEngine } from './ai/engine.js';
import { LocalChatEngine } from './ai/local-engine.js';
import { MockMedicalEngine } from './integrations/medical-engine.js';
import { MockProviderDirectory } from './integrations/provider-directory.js';
import { MockAggregator } from './integrations/wearables.js';
import { AssessmentService } from './services/assessment.js';
import { AuditService } from './services/audit.js';
import { CareService } from './services/care.js';
import { ConsentService } from './services/consent.js';
import { ConversationService } from './services/conversation.js';
import { DeviceService } from './services/devices.js';
import { GoalService } from './services/goals.js';
import { IdentityService } from './services/identity.js';
import { ProviderService } from './services/providers.js';
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
  conversation: ConversationService;
  care: CareService;
  devices: DeviceService;
  assessment: AssessmentService;
  providers: ProviderService;
  goals: GoalService;
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

  const chatEngine: ChatEngine =
    config.CHAT_ENGINE === 'bedrock'
      ? new BedrockChatEngine({ region: config.AWS_REGION!, modelId: config.BEDROCK_MODEL_ID })
      : new LocalChatEngine();

  const tracking = new TrackingService(repos.events);

  return {
    config,
    repos,
    verifier,
    issuer,
    identity: new IdentityService(repos),
    consent: new ConsentService(repos),
    tracking,
    conversation: new ConversationService(repos.conversations, chatEngine, tracking, repos.profiles),
    care: new CareService(repos.medications, repos.reminders, repos.appointments, repos.events),
    devices: new DeviceService(repos.devices, repos.metrics, new MockAggregator()),
    assessment: new AssessmentService(repos.assessments, new MockMedicalEngine(), repos.profiles),
    providers: new ProviderService(new MockProviderDirectory()),
    goals: new GoalService(repos.goals),
    audit: new AuditService(repos.audit),
  };
}

// Make the context available on the Fastify instance and requests.
declare module 'fastify' {
  interface FastifyInstance {
    ctx: AppContext;
  }
}
