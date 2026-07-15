import type {
  AppointmentRecord,
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
import type {
  AppointmentRepository,
  AuditRepository,
  ConsentRepository,
  ConversationRepository,
  DeviceRepository,
  EventQuery,
  EventRepository,
  MedicationRepository,
  MetricRepository,
  ProfileRepository,
  ReminderRepository,
  Repositories,
  UserRepository,
} from './repositories.js';

/**
 * In-memory repositories for dev/test. Not for production — no persistence, no
 * encryption. The Postgres/Prisma implementation (M2) replaces these behind the same
 * interfaces.
 */
class MemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, UserRecord>();

  async findById(id: string): Promise<UserRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async findByCognitoSub(sub: string): Promise<UserRecord | null> {
    for (const u of this.byId.values()) if (u.cognitoSub === sub) return u;
    return null;
  }
  async findByEmail(email: string): Promise<UserRecord | null> {
    const needle = email.toLowerCase();
    for (const u of this.byId.values()) if (u.email.toLowerCase() === needle) return u;
    return null;
  }
  async create(user: Omit<UserRecord, 'createdAt'>): Promise<UserRecord> {
    const record: UserRecord = { ...user, createdAt: new Date().toISOString() };
    this.byId.set(record.id, record);
    return record;
  }
  async softDelete(id: string, at: string): Promise<void> {
    const u = this.byId.get(id);
    if (u) this.byId.set(id, { ...u, status: 'deleted', deletedAt: at });
  }
}

class MemoryProfileRepository implements ProfileRepository {
  private readonly byUser = new Map<string, ProfileRecord>();
  async findByUserId(userId: string): Promise<ProfileRecord | null> {
    return this.byUser.get(userId) ?? null;
  }
  async upsert(profile: ProfileRecord): Promise<ProfileRecord> {
    this.byUser.set(profile.userId, profile);
    return profile;
  }
}

class MemoryConsentRepository implements ConsentRepository {
  private readonly byUser = new Map<string, Map<string, ConsentRecord>>();
  async listByUser(userId: string): Promise<ConsentRecord[]> {
    return [...(this.byUser.get(userId)?.values() ?? [])];
  }
  async upsert(consent: ConsentRecord): Promise<ConsentRecord> {
    const map = this.byUser.get(consent.userId) ?? new Map<string, ConsentRecord>();
    map.set(consent.scope, consent);
    this.byUser.set(consent.userId, map);
    return consent;
  }
  async revoke(userId: string, scope: string, at: string): Promise<void> {
    const existing = this.byUser.get(userId)?.get(scope);
    if (existing) {
      await this.upsert({ ...existing, granted: false, revokedAt: at });
    }
  }
}

class MemoryEventRepository implements EventRepository {
  private readonly byId = new Map<string, EventRecord>();

  async create(record: EventRecord): Promise<EventRecord> {
    this.byId.set(record.id, record);
    return record;
  }
  async findById(id: string): Promise<EventRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async update(
    id: string,
    patch: Partial<Pick<EventRecord, 'data' | 'occurredAt'>>,
  ): Promise<EventRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error('event not found');
    const next = { ...existing, ...patch };
    this.byId.set(id, next);
    return next;
  }
  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  private sortedForUser(userId: string): EventRecord[] {
    return [...this.byId.values()]
      .filter((e) => e.userId === userId)
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)); // newest first
  }

  async query(q: EventQuery): Promise<{ items: EventRecord[]; nextCursor: string | null }> {
    let rows = this.sortedForUser(q.userId);
    if (q.type) rows = rows.filter((e) => e.type === q.type);
    if (q.from) rows = rows.filter((e) => e.occurredAt >= q.from!);
    if (q.to) rows = rows.filter((e) => e.occurredAt < q.to!);
    if (q.cursor) {
      const idx = rows.findIndex((e) => e.id === q.cursor);
      rows = idx >= 0 ? rows.slice(idx + 1) : rows;
    }

    const page = rows.slice(0, q.limit);
    const nextCursor = rows.length > q.limit ? (page[page.length - 1]?.id ?? null) : null;
    return { items: page, nextCursor };
  }

  async listInRange(userId: string, from: string, to: string): Promise<EventRecord[]> {
    return this.sortedForUser(userId).filter((e) => e.occurredAt >= from && e.occurredAt < to);
  }
}

class MemoryConversationRepository implements ConversationRepository {
  private readonly convos = new Map<string, ConversationRecord>();
  private readonly messages = new Map<string, MessageRecord[]>();

  async create(record: ConversationRecord): Promise<ConversationRecord> {
    this.convos.set(record.id, record);
    this.messages.set(record.id, []);
    return record;
  }
  async findById(id: string): Promise<ConversationRecord | null> {
    return this.convos.get(id) ?? null;
  }
  async listByUser(userId: string): Promise<ConversationRecord[]> {
    return [...this.convos.values()]
      .filter((c) => c.userId === userId)
      .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
  }
  async touch(id: string, at: string): Promise<void> {
    const c = this.convos.get(id);
    if (c) this.convos.set(id, { ...c, lastMessageAt: at });
  }
  async addMessage(record: MessageRecord): Promise<MessageRecord> {
    const list = this.messages.get(record.conversationId) ?? [];
    list.push(record);
    this.messages.set(record.conversationId, list);
    return record;
  }
  async listMessages(conversationId: string): Promise<MessageRecord[]> {
    return [...(this.messages.get(conversationId) ?? [])];
  }
}

class MemoryMedicationRepository implements MedicationRepository {
  private readonly byId = new Map<string, MedicationRecord>();
  async create(record: MedicationRecord): Promise<MedicationRecord> {
    this.byId.set(record.id, record);
    return record;
  }
  async findById(id: string): Promise<MedicationRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async listByUser(userId: string, activeOnly = false): Promise<MedicationRecord[]> {
    return [...this.byId.values()].filter((m) => m.userId === userId && (!activeOnly || m.active));
  }
  async update(id: string, patch: Partial<MedicationRecord>): Promise<MedicationRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error('medication not found');
    const next = { ...existing, ...patch };
    this.byId.set(id, next);
    return next;
  }
}

class MemoryReminderRepository implements ReminderRepository {
  private readonly byId = new Map<string, ReminderRecord>();
  async createMany(records: ReminderRecord[]): Promise<void> {
    for (const r of records) this.byId.set(r.id, r);
  }
  async findById(id: string): Promise<ReminderRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async listByUser(userId: string, from: string, to: string): Promise<ReminderRecord[]> {
    return [...this.byId.values()]
      .filter((r) => r.userId === userId && r.scheduledAt >= from && r.scheduledAt < to)
      .sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));
  }
  async update(id: string, patch: Partial<ReminderRecord>): Promise<ReminderRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error('reminder not found');
    const next = { ...existing, ...patch };
    this.byId.set(id, next);
    return next;
  }
}

class MemoryAppointmentRepository implements AppointmentRepository {
  private readonly byId = new Map<string, AppointmentRecord>();
  async create(record: AppointmentRecord): Promise<AppointmentRecord> {
    this.byId.set(record.id, record);
    return record;
  }
  async findById(id: string): Promise<AppointmentRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async listByUser(userId: string): Promise<AppointmentRecord[]> {
    return [...this.byId.values()]
      .filter((a) => a.userId === userId)
      .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
  }
  async update(id: string, patch: Partial<AppointmentRecord>): Promise<AppointmentRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error('appointment not found');
    const next = { ...existing, ...patch };
    this.byId.set(id, next);
    return next;
  }
}

class MemoryDeviceRepository implements DeviceRepository {
  private readonly byId = new Map<string, DeviceConnectionRecord>();
  async create(record: DeviceConnectionRecord): Promise<DeviceConnectionRecord> {
    this.byId.set(record.id, record);
    return record;
  }
  async findById(id: string): Promise<DeviceConnectionRecord | null> {
    return this.byId.get(id) ?? null;
  }
  async findByVendor(userId: string, vendor: string): Promise<DeviceConnectionRecord | null> {
    for (const d of this.byId.values()) if (d.userId === userId && d.vendor === vendor) return d;
    return null;
  }
  async listByUser(userId: string): Promise<DeviceConnectionRecord[]> {
    return [...this.byId.values()].filter((d) => d.userId === userId);
  }
  async update(id: string, patch: Partial<DeviceConnectionRecord>): Promise<DeviceConnectionRecord> {
    const existing = this.byId.get(id);
    if (!existing) throw new Error('device not found');
    const next = { ...existing, ...patch };
    this.byId.set(id, next);
    return next;
  }
}

class MemoryMetricRepository implements MetricRepository {
  private readonly samples: MetricSampleRecord[] = [];
  async insertMany(records: MetricSampleRecord[]): Promise<number> {
    this.samples.push(...records);
    return records.length;
  }
  async query(userId: string, metric: string, from: string, to: string): Promise<MetricSampleRecord[]> {
    return this.samples
      .filter((s) => s.userId === userId && s.metric === metric && s.ts >= from && s.ts < to)
      .sort((a, b) => (a.ts < b.ts ? -1 : 1));
  }
}

class MemoryAuditRepository implements AuditRepository {
  private readonly records: AuditRecord[] = [];
  async append(record: AuditRecord): Promise<void> {
    this.records.push(record); // append-only
  }
  async listBySubject(subjectUserId: string): Promise<AuditRecord[]> {
    return this.records.filter((r) => r.subjectUserId === subjectUserId);
  }
}

export function createMemoryRepositories(): Repositories {
  return {
    users: new MemoryUserRepository(),
    profiles: new MemoryProfileRepository(),
    consents: new MemoryConsentRepository(),
    events: new MemoryEventRepository(),
    conversations: new MemoryConversationRepository(),
    medications: new MemoryMedicationRepository(),
    reminders: new MemoryReminderRepository(),
    appointments: new MemoryAppointmentRepository(),
    devices: new MemoryDeviceRepository(),
    metrics: new MemoryMetricRepository(),
    audit: new MemoryAuditRepository(),
  };
}
