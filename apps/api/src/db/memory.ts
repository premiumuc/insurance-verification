import type {
  AuditRecord,
  ConsentRecord,
  EventRecord,
  ProfileRecord,
  UserRecord,
} from './models.js';
import type {
  AuditRepository,
  ConsentRepository,
  EventQuery,
  EventRepository,
  ProfileRepository,
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
    audit: new MemoryAuditRepository(),
  };
}
