import { randomUUID } from 'node:crypto';
import type {
  CreateHealthEvent,
  DailySummary,
  HealthEvent,
  HealthEventType,
  Pattern,
  PatternsResponse,
} from '@healthy-companion/types';
import { EventDataSchemas } from '@healthy-companion/types';
import type { EventRecord } from '../db/models.js';
import type { EventRepository } from '../db/repositories.js';
import { AppError } from '../errors.js';

function toDto(e: EventRecord): HealthEvent {
  return {
    id: e.id,
    type: e.type as HealthEventType,
    source: e.source,
    occurredAt: e.occurredAt,
    data: e.data,
    confidence: e.confidence,
    createdAt: e.createdAt,
  };
}

function dayBounds(dateISO: string): { from: string; to: string } {
  const from = new Date(`${dateISO}T00:00:00.000Z`);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Health-event tracking + derived views (daily summary, non-clinical patterns).
 * This is the structured backend that the conversational front door writes into (M3)
 * and the dashboard reads from (docs/05 §5.3).
 */
export class TrackingService {
  constructor(private readonly events: EventRepository) {}

  async create(userId: string, input: CreateHealthEvent): Promise<HealthEvent> {
    const record: EventRecord = {
      id: randomUUID(),
      userId,
      type: input.type,
      source: input.source,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      data: input.data,
      confidence: null,
      createdAt: new Date().toISOString(),
    };
    return toDto(await this.events.create(record));
  }

  async list(
    userId: string,
    opts: { type?: HealthEventType; from?: string; to?: string; limit: number; cursor?: string },
  ): Promise<{ items: HealthEvent[]; nextCursor: string | null }> {
    const { items, nextCursor } = await this.events.query({ userId, ...opts });
    return { items: items.map(toDto), nextCursor };
  }

  private async ownedOrThrow(userId: string, id: string): Promise<EventRecord> {
    const existing = await this.events.findById(id);
    if (!existing) throw AppError.notFound('Event not found');
    if (existing.userId !== userId) throw AppError.forbidden();
    return existing;
  }

  async update(
    userId: string,
    id: string,
    patch: { data?: Record<string, unknown>; occurredAt?: string },
  ): Promise<HealthEvent> {
    const existing = await this.ownedOrThrow(userId, id);
    // Validate a data patch against the event's type schema.
    if (patch.data) {
      const schema = EventDataSchemas[existing.type as HealthEventType];
      const parsed = schema.safeParse(patch.data);
      if (!parsed.success) throw AppError.validation('Invalid event data', parsed.error.flatten().fieldErrors);
    }
    return toDto(await this.events.update(id, patch));
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ownedOrThrow(userId, id);
    await this.events.delete(id);
  }

  async dailySummary(userId: string, dateISO: string): Promise<DailySummary> {
    const { from, to } = dayBounds(dateISO);
    const events = await this.events.listInRange(userId, from, to);

    const counts: Record<string, number> = {};
    let waterMl = 0;
    let sleepMinutes: number | null = null;
    let latestMood: number | null = null;
    let latestWeightKg: number | null = null;

    // events are newest-first
    for (const e of events) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
      if (e.type === 'water') waterMl += Number(e.data.volumeMl ?? 0);
      if (e.type === 'sleep' && sleepMinutes === null) sleepMinutes = Number(e.data.durationMinutes ?? 0);
      if (e.type === 'mood' && latestMood === null) latestMood = Number(e.data.score ?? 0);
      if (e.type === 'weight' && latestWeightKg === null) latestWeightKg = Number(e.data.kg ?? 0);
    }

    return {
      date: dateISO,
      counts,
      waterMl,
      sleepMinutes,
      latestMood,
      latestWeightKg,
      events: events.map(toDto),
    };
  }

  /**
   * Non-clinical pattern detection over a window. Deterministic and conservative —
   * these are gentle observations, never diagnoses (docs/07 §7.2). The AI layer (M3+)
   * narrates these; it does not decide them.
   */
  async patterns(userId: string, windowDays: number): Promise<PatternsResponse> {
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - windowDays);
    const events = await this.events.listInRange(userId, from.toISOString(), to.toISOString());

    const patterns: Pattern[] = [];

    // Recurring symptom on 3+ distinct days.
    const symptomDays = new Map<string, Set<string>>();
    for (const e of events) {
      if (e.type !== 'symptom') continue;
      const label = String(e.data.label ?? 'symptom').toLowerCase();
      const day = e.occurredAt.slice(0, 10);
      const set = symptomDays.get(label) ?? new Set<string>();
      set.add(day);
      symptomDays.set(label, set);
    }
    for (const [label, days] of symptomDays) {
      if (days.size >= 3) {
        patterns.push({
          id: `recurring:${label}`,
          kind: 'recurring_symptom',
          severity: 'suggestion',
          message: `You've logged "${label}" on ${days.size} days recently. If it keeps up, it may be worth talking to a provider.`,
          relatedType: 'symptom',
        });
      }
    }

    // Low hydration today (< 1000ml logged).
    const todayWater = events
      .filter((e) => e.type === 'water' && e.occurredAt.slice(0, 10) === to.toISOString().slice(0, 10))
      .reduce((sum, e) => sum + Number(e.data.volumeMl ?? 0), 0);
    if (todayWater > 0 && todayWater < 1000) {
      patterns.push({
        id: 'low_hydration',
        kind: 'low_hydration',
        severity: 'info',
        message: 'Hydration looks a little low today — a glass of water might help.',
        relatedType: 'water',
      });
    }

    return { windowDays, patterns };
  }
}
