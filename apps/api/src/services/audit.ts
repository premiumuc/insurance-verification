import { randomUUID } from 'node:crypto';
import type { AuditAction } from '../db/models.js';
import type { AuditRepository } from '../db/repositories.js';

export interface AuditContext {
  actorUserId: string | null;
  subjectUserId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  purpose: string;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Writes tamper-evident audit records for PHI access (HIPAA §164.312(b)).
 * Every route that reads or mutates PHI MUST call this. In production the same records
 * are mirrored to immutable storage (S3 Object Lock) — see docs/06.
 */
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async record(ctx: AuditContext): Promise<void> {
    await this.repo.append({
      id: randomUUID(),
      actorUserId: ctx.actorUserId,
      subjectUserId: ctx.subjectUserId,
      action: ctx.action,
      resourceType: ctx.resourceType,
      resourceId: ctx.resourceId ?? null,
      purpose: ctx.purpose,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      createdAt: new Date().toISOString(),
    });
  }
}
