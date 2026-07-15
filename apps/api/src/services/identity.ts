import { randomUUID } from 'node:crypto';
import type { MeResponse, Profile, RegisterRequest, UpdateProfile } from '@healthy-companion/types';
import { REQUIRED_ONBOARDING_SCOPES } from '@healthy-companion/types';
import type { ProfileRecord, UserRecord } from '../db/models.js';
import type { Repositories } from '../db/repositories.js';
import { AppError } from '../errors.js';

function emptyProfile(userId: string): ProfileRecord {
  return {
    userId,
    firstName: null,
    lastName: null,
    dateOfBirth: null,
    sexAtBirth: null,
    genderIdentity: null,
    heightCm: null,
    bloodType: null,
    conditions: [],
    allergies: [],
    pregnancyStatus: null,
    locale: 'en-US',
    updatedAt: new Date().toISOString(),
  };
}

function toProfileDto(p: ProfileRecord): Profile {
  const { userId: _userId, ...rest } = p;
  return {
    ...rest,
    sexAtBirth: p.sexAtBirth,
    bloodType: (p.bloodType as Profile['bloodType']) ?? null,
    pregnancyStatus: p.pregnancyStatus,
  };
}

/** Register, read, and update the app-side identity + profile (see docs/04). */
export class IdentityService {
  constructor(private readonly repos: Repositories) {}

  /**
   * Provision the app-side user after a Cognito sign-up (or dev sign-up).
   * Idempotent by cognitoSub: a repeated register returns the existing user.
   */
  async register(cognitoSub: string, req: RegisterRequest): Promise<UserRecord> {
    const existing = await this.repos.users.findByCognitoSub(cognitoSub);
    if (existing) return existing;

    if (await this.repos.users.findByEmail(req.email)) {
      throw new AppError('conflict', 409, 'An account with this email already exists');
    }

    const user = await this.repos.users.create({
      id: randomUUID(),
      cognitoSub,
      role: 'user',
      orgId: null,
      email: req.email,
      status: 'active',
      deletedAt: null,
    });

    const profile = emptyProfile(user.id);
    if (req.firstName) profile.firstName = req.firstName;
    if (req.lastName) profile.lastName = req.lastName;
    await this.repos.profiles.upsert(profile);

    return user;
  }

  async getUserByCognitoSub(sub: string): Promise<UserRecord | null> {
    return this.repos.users.findByCognitoSub(sub);
  }

  async updateProfile(userId: string, patch: UpdateProfile): Promise<Profile> {
    const current = (await this.repos.profiles.findByUserId(userId)) ?? emptyProfile(userId);
    const next: ProfileRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const saved = await this.repos.profiles.upsert(next);
    return toProfileDto(saved);
  }

  /** Assemble the full /v1/me view including onboarding completeness. */
  async getMe(user: UserRecord): Promise<MeResponse> {
    const profile = (await this.repos.profiles.findByUserId(user.id)) ?? emptyProfile(user.id);
    const consents = await this.repos.consents.listByUser(user.id);

    const grantedScopes = new Set(consents.filter((c) => c.granted).map((c) => c.scope));
    const hasRequiredConsents = REQUIRED_ONBOARDING_SCOPES.every((s) => grantedScopes.has(s));
    const hasMinimumProfile = Boolean(profile.dateOfBirth && profile.sexAtBirth);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      onboardingComplete: hasRequiredConsents && hasMinimumProfile,
      profile: toProfileDto(profile),
      consents: consents.map((c) => ({
        scope: c.scope,
        granted: c.granted,
        version: c.version,
        grantedAt: c.grantedAt,
        revokedAt: c.revokedAt,
      })),
      createdAt: user.createdAt,
    };
  }
}
