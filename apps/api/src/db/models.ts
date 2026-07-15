import type { ConsentScope, Role } from '@healthy-companion/types';

/**
 * Persistence-layer domain models. These are the shapes repositories store and return.
 * They are deliberately separate from API DTOs (in @healthy-companion/types) so the wire
 * format and storage format can evolve independently.
 */

export interface UserRecord {
  id: string;
  cognitoSub: string;
  role: Role;
  orgId: string | null;
  email: string; // 🔐 field-encrypted at rest in the Postgres impl (see docs/03)
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
  deletedAt: string | null;
}

export interface ProfileRecord {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null; // YYYY-MM-DD 🔐
  sexAtBirth: 'female' | 'male' | 'intersex' | 'unknown' | null;
  genderIdentity: string | null;
  heightCm: number | null;
  bloodType: string | null;
  conditions: string[];
  allergies: string[];
  pregnancyStatus: 'not_pregnant' | 'pregnant' | 'unknown' | 'not_applicable' | null;
  locale: string;
  updatedAt: string;
}

export interface ConsentRecord {
  userId: string;
  scope: ConsentScope;
  granted: boolean;
  version: string;
  grantedAt: string | null;
  revokedAt: string | null;
}

export type AuditAction = 'read' | 'create' | 'update' | 'delete' | 'export' | 'share';

export interface AuditRecord {
  id: string;
  actorUserId: string | null;
  subjectUserId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  purpose: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
