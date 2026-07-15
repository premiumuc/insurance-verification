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

export interface EventRecord {
  id: string;
  userId: string;
  type: string;
  source: 'chat' | 'manual' | 'device' | 'import';
  occurredAt: string;
  data: Record<string, unknown>;
  confidence: number | null;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // 🔐
  intent: 'log' | 'ask' | 'both' | 'emergency' | null;
  eventIds: string[];
  safetyFlag: string | null;
  model: string | null;
  createdAt: string;
}

export interface MedicationRecord {
  id: string;
  userId: string;
  name: string;
  dosage: string | null;
  form: string | null;
  isSupplement: boolean;
  schedule: { times: string[]; frequency: 'daily' };
  active: boolean;
  conditionTag: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ReminderRecord {
  id: string;
  userId: string;
  medicationId: string;
  scheduledAt: string;
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  respondedAt: string | null;
}

export interface AppointmentRecord {
  id: string;
  userId: string;
  title: string;
  providerName: string | null;
  startsAt: string;
  location: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  createdAt: string;
}

export interface DeviceConnectionRecord {
  id: string;
  userId: string;
  vendor: string;
  externalAccountId: string | null;
  accessToken: string | null; // 🔐
  refreshToken: string | null; // 🔐
  status: 'connected' | 'disconnected' | 'error';
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface MetricSampleRecord {
  userId: string;
  deviceConnectionId: string | null;
  metric: string;
  value: number;
  unit: string;
  ts: string;
  source: string;
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
