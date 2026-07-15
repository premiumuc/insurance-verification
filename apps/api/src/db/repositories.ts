import type {
  AuditRecord,
  ConsentRecord,
  ConversationRecord,
  EventRecord,
  MessageRecord,
  ProfileRecord,
  UserRecord,
} from './models.js';

/**
 * Repository interfaces — the boundary between domain logic and storage.
 *
 * M1 ships an in-memory implementation so the stack runs and is fully tested without a
 * database server. M2 adds a Prisma/Postgres implementation behind these same
 * interfaces (see prisma/schema.prisma) with zero changes to services/routes.
 */
export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByCognitoSub(sub: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(user: Omit<UserRecord, 'createdAt'>): Promise<UserRecord>;
  softDelete(id: string, at: string): Promise<void>;
}

export interface ProfileRepository {
  findByUserId(userId: string): Promise<ProfileRecord | null>;
  upsert(profile: ProfileRecord): Promise<ProfileRecord>;
}

export interface ConsentRepository {
  listByUser(userId: string): Promise<ConsentRecord[]>;
  upsert(consent: ConsentRecord): Promise<ConsentRecord>;
  revoke(userId: string, scope: string, at: string): Promise<void>;
}

export interface EventQuery {
  userId: string;
  type?: string;
  from?: string;
  to?: string;
  limit: number;
  cursor?: string;
}

export interface EventRepository {
  create(record: EventRecord): Promise<EventRecord>;
  findById(id: string): Promise<EventRecord | null>;
  update(id: string, patch: Partial<Pick<EventRecord, 'data' | 'occurredAt'>>): Promise<EventRecord>;
  delete(id: string): Promise<void>;
  /** Returns events newest-first with an opaque nextCursor. */
  query(q: EventQuery): Promise<{ items: EventRecord[]; nextCursor: string | null }>;
  /** All of a user's events within [from, to) — used by summary/patterns. */
  listInRange(userId: string, from: string, to: string): Promise<EventRecord[]>;
}

export interface ConversationRepository {
  create(record: ConversationRecord): Promise<ConversationRecord>;
  findById(id: string): Promise<ConversationRecord | null>;
  listByUser(userId: string): Promise<ConversationRecord[]>;
  touch(id: string, at: string): Promise<void>;
  addMessage(record: MessageRecord): Promise<MessageRecord>;
  listMessages(conversationId: string): Promise<MessageRecord[]>;
}

export interface AuditRepository {
  append(record: AuditRecord): Promise<void>;
  listBySubject(subjectUserId: string): Promise<AuditRecord[]>;
}

export interface Repositories {
  users: UserRepository;
  profiles: ProfileRepository;
  consents: ConsentRepository;
  events: EventRepository;
  conversations: ConversationRepository;
  audit: AuditRepository;
}
