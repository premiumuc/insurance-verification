import type { Consent, ConsentScope, GrantConsent } from '@healthy-companion/types';
import type { ConsentRecord } from '../db/models.js';
import type { Repositories } from '../db/repositories.js';

function toDto(c: ConsentRecord): Consent {
  return {
    scope: c.scope,
    granted: c.granted,
    version: c.version,
    grantedAt: c.grantedAt,
    revokedAt: c.revokedAt,
  };
}

/** Manage consent grants that gate data processing/sharing (see docs/06 §6.3). */
export class ConsentService {
  constructor(private readonly repos: Repositories) {}

  async list(userId: string): Promise<Consent[]> {
    return (await this.repos.consents.listByUser(userId)).map(toDto);
  }

  async grant(userId: string, input: GrantConsent): Promise<Consent> {
    const record: ConsentRecord = {
      userId,
      scope: input.scope,
      granted: true,
      version: input.version,
      grantedAt: new Date().toISOString(),
      revokedAt: null,
    };
    return toDto(await this.repos.consents.upsert(record));
  }

  async revoke(userId: string, scope: ConsentScope): Promise<void> {
    await this.repos.consents.revoke(userId, scope, new Date().toISOString());
  }
}
