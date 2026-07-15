import type {
  AuditRecord,
  ConsentRecord,
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

export interface AuditRepository {
  append(record: AuditRecord): Promise<void>;
  listBySubject(subjectUserId: string): Promise<AuditRecord[]>;
}

export interface Repositories {
  users: UserRepository;
  profiles: ProfileRepository;
  consents: ConsentRepository;
  audit: AuditRepository;
}
