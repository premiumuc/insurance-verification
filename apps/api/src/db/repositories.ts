import type {
  AppointmentRecord,
  AssessmentRecord,
  AuditRecord,
  ConsentRecord,
  ConversationRecord,
  DeviceConnectionRecord,
  EventRecord,
  MedicationRecord,
  MessageRecord,
  MetricSampleRecord,
  ProfileRecord,
  ReminderRecord,
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

export interface MedicationRepository {
  create(record: MedicationRecord): Promise<MedicationRecord>;
  findById(id: string): Promise<MedicationRecord | null>;
  listByUser(userId: string, activeOnly?: boolean): Promise<MedicationRecord[]>;
  update(id: string, patch: Partial<MedicationRecord>): Promise<MedicationRecord>;
}

export interface ReminderRepository {
  createMany(records: ReminderRecord[]): Promise<void>;
  findById(id: string): Promise<ReminderRecord | null>;
  listByUser(userId: string, from: string, to: string): Promise<ReminderRecord[]>;
  update(id: string, patch: Partial<ReminderRecord>): Promise<ReminderRecord>;
}

export interface AppointmentRepository {
  create(record: AppointmentRecord): Promise<AppointmentRecord>;
  findById(id: string): Promise<AppointmentRecord | null>;
  listByUser(userId: string): Promise<AppointmentRecord[]>;
  update(id: string, patch: Partial<AppointmentRecord>): Promise<AppointmentRecord>;
}

export interface DeviceRepository {
  create(record: DeviceConnectionRecord): Promise<DeviceConnectionRecord>;
  findById(id: string): Promise<DeviceConnectionRecord | null>;
  findByVendor(userId: string, vendor: string): Promise<DeviceConnectionRecord | null>;
  listByUser(userId: string): Promise<DeviceConnectionRecord[]>;
  update(id: string, patch: Partial<DeviceConnectionRecord>): Promise<DeviceConnectionRecord>;
}

export interface MetricRepository {
  insertMany(records: MetricSampleRecord[]): Promise<number>;
  query(userId: string, metric: string, from: string, to: string): Promise<MetricSampleRecord[]>;
}

export interface AssessmentRepository {
  create(record: AssessmentRecord): Promise<AssessmentRecord>;
  findById(id: string): Promise<AssessmentRecord | null>;
  listByUser(userId: string): Promise<AssessmentRecord[]>;
  update(id: string, patch: Partial<AssessmentRecord>): Promise<AssessmentRecord>;
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
  medications: MedicationRepository;
  reminders: ReminderRepository;
  appointments: AppointmentRepository;
  devices: DeviceRepository;
  metrics: MetricRepository;
  assessments: AssessmentRepository;
  audit: AuditRepository;
}
