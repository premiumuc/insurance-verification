import { randomUUID } from 'node:crypto';
import { evaluate } from '@healthy-companion/safety-rules';
import type {
  Assessment,
  CreateAssessmentResponse,
  EmergencyBlock,
} from '@healthy-companion/types';
import type { AssessmentRecord } from '../db/models.js';
import type { AssessmentRepository, ProfileRepository } from '../db/repositories.js';
import { AppError } from '../errors.js';
import type { MedicalEngine } from '../integrations/medical-engine.js';

function ageFromDob(dob: string | null): number | undefined {
  if (!dob) return undefined;
  const born = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - born.getUTCFullYear();
  const m = now.getUTCMonth() - born.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < born.getUTCDate())) age--;
  return age;
}

function toDto(a: AssessmentRecord): Assessment {
  return {
    id: a.id,
    reportedSymptoms: a.reportedSymptoms,
    engine: a.engine,
    result: a.result as unknown as Assessment['result'],
    disclaimerShown: true,
    shareable: a.shareable,
    createdAt: a.createdAt,
  };
}

/**
 * Contextualized self-diagnosis (docs/07 §7.1). Runs the deterministic Safety Gate over
 * the symptoms FIRST; an emergency short-circuits without calling the medical engine.
 * Records the exact context used (data minimization + auditability).
 */
export class AssessmentService {
  constructor(
    private readonly repo: AssessmentRepository,
    private readonly engine: MedicalEngine,
    private readonly profiles: ProfileRepository,
  ) {}

  async create(userId: string, symptoms: string[]): Promise<CreateAssessmentResponse> {
    const joined = symptoms.join(', ');

    // 1. Safety gate first.
    const safety = evaluate(joined);
    if (safety.escalate && safety.primary) {
      const emergency: EmergencyBlock = {
        severity: 'emergency',
        category: safety.primary.category,
        message: safety.primary.message,
        actions: safety.primary.actions,
      };
      return { assessment: null, emergency };
    }

    // 2. Assemble minimal context.
    const profile = await this.profiles.findByUserId(userId);
    const ctx = {
      ageYears: ageFromDob(profile?.dateOfBirth ?? null),
      sexAtBirth: profile?.sexAtBirth ?? null,
      conditions: profile?.conditions ?? [],
    };

    // 3. Assess via the vetted engine.
    const result = await this.engine.assess(symptoms, ctx);

    // If the engine's own triage is emergency, surface it as an emergency too.
    if (result.triage === 'emergency') {
      return {
        assessment: null,
        emergency: {
          severity: 'emergency',
          category: 'Urgent symptoms',
          message: 'Your symptoms may need urgent care. Please seek emergency help now.',
          actions: ['call_911', 'find_nearest_er'],
        },
      };
    }

    const record: AssessmentRecord = {
      id: randomUUID(),
      userId,
      reportedSymptoms: symptoms,
      contextSnapshot: ctx as Record<string, unknown>,
      engine: this.engine.name,
      result: result as unknown as Record<string, unknown>,
      shareable: false,
      createdAt: new Date().toISOString(),
    };
    await this.repo.create(record);
    return { assessment: toDto(record), emergency: null };
  }

  async list(userId: string): Promise<Assessment[]> {
    return (await this.repo.listByUser(userId)).map(toDto);
  }

  private async owned(userId: string, id: string): Promise<AssessmentRecord> {
    const a = await this.repo.findById(id);
    if (!a) throw AppError.notFound('Assessment not found');
    if (a.userId !== userId) throw AppError.forbidden();
    return a;
  }

  async get(userId: string, id: string): Promise<Assessment> {
    return toDto(await this.owned(userId, id));
  }

  async markShareable(userId: string, id: string): Promise<Assessment> {
    await this.owned(userId, id);
    return toDto(await this.repo.update(id, { shareable: true }));
  }
}
