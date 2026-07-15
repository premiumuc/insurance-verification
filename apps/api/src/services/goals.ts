import { randomUUID } from 'node:crypto';
import type { CreateGoal, Goal, UpdateGoal } from '@healthy-companion/types';
import type { GoalRecord } from '../db/models.js';
import type { GoalRepository } from '../db/repositories.js';
import { AppError } from '../errors.js';

function toDto(g: GoalRecord): Goal {
  const { userId: _u, ...rest } = g;
  return { ...rest, type: g.type as Goal['type'], status: g.status };
}

/** Wellness goals (docs/03 §3.8). */
export class GoalService {
  constructor(private readonly repo: GoalRepository) {}

  async list(userId: string): Promise<Goal[]> {
    return (await this.repo.listByUser(userId)).map(toDto);
  }

  async create(userId: string, input: CreateGoal): Promise<Goal> {
    const record: GoalRecord = {
      id: randomUUID(),
      userId,
      type: input.type,
      title: input.title,
      target: input.target,
      unit: input.unit,
      current: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    return toDto(await this.repo.create(record));
  }

  async update(userId: string, id: string, patch: UpdateGoal): Promise<Goal> {
    const existing = await this.repo.findById(id);
    if (!existing) throw AppError.notFound('Goal not found');
    if (existing.userId !== userId) throw AppError.forbidden();
    // Auto-mark achieved when current reaches target.
    const next: Partial<GoalRecord> = { ...patch };
    const current = patch.current ?? existing.current;
    if (!patch.status && current >= existing.target && existing.target > 0) next.status = 'achieved';
    return toDto(await this.repo.update(id, next));
  }
}
