import { randomUUID } from 'node:crypto';
import { evaluate } from '@healthy-companion/safety-rules';
import type { EmergencyBlock, Message, PostMessageResponse } from '@healthy-companion/types';
import type { ChatEngine, ChatContext } from '../ai/engine.js';
import type { ConversationRecord, MessageRecord, UserRecord } from '../db/models.js';
import type { ConversationRepository, ProfileRepository } from '../db/repositories.js';
import { AppError } from '../errors.js';
import type { TrackingService } from './tracking.js';

function toMessageDto(m: MessageRecord): Message {
  return { id: m.id, role: m.role, content: m.content, intent: m.intent, createdAt: m.createdAt };
}

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

/**
 * Orchestrates the hybrid front door (docs/02 §2.6, docs/07):
 *   1. Deterministic Safety Gate FIRST. On an emergency, short-circuit — no engine call.
 *   2. Otherwise the ChatEngine understands the message and extracts structured events.
 *   3. Extracted events are persisted (they appear on the dashboard immediately).
 *   4. Assistant reply is saved and returned with the structured side-effects.
 */
export class ConversationService {
  constructor(
    private readonly convos: ConversationRepository,
    private readonly engine: ChatEngine,
    private readonly tracking: TrackingService,
    private readonly profiles: ProfileRepository,
  ) {}

  async create(userId: string, title?: string): Promise<ConversationRecord> {
    const now = new Date().toISOString();
    return this.convos.create({
      id: randomUUID(),
      userId,
      title: title?.slice(0, 120) ?? 'New conversation',
      lastMessageAt: now,
      createdAt: now,
    });
  }

  async list(userId: string): Promise<ConversationRecord[]> {
    return this.convos.listByUser(userId);
  }

  private async ownedConvo(userId: string, id: string): Promise<ConversationRecord> {
    const c = await this.convos.findById(id);
    if (!c) throw AppError.notFound('Conversation not found');
    if (c.userId !== userId) throw AppError.forbidden();
    return c;
  }

  async messages(userId: string, conversationId: string): Promise<Message[]> {
    await this.ownedConvo(userId, conversationId);
    return (await this.convos.listMessages(conversationId)).map(toMessageDto);
  }

  async postMessage(
    user: UserRecord,
    conversationId: string,
    content: string,
  ): Promise<PostMessageResponse> {
    await this.ownedConvo(user.id, conversationId);
    const now = new Date().toISOString();

    // Persist the user's message.
    const userMsg: MessageRecord = {
      id: randomUUID(),
      conversationId,
      role: 'user',
      content,
      intent: null,
      eventIds: [],
      safetyFlag: null,
      model: null,
      createdAt: now,
    };
    await this.convos.addMessage(userMsg);

    // 1. SAFETY GATE — deterministic, before any model.
    const profile = await this.profiles.findByUserId(user.id);
    const safety = evaluate(content, {
      ageYears: ageFromDob(profile?.dateOfBirth ?? null),
      isPregnant: profile?.pregnancyStatus === 'pregnant',
      knownConditions: profile?.conditions ?? [],
    });

    if (safety.escalate && safety.primary) {
      const emergency: EmergencyBlock = {
        severity: 'emergency',
        category: safety.primary.category,
        message: safety.primary.message,
        actions: safety.primary.actions,
      };
      const assistant = await this.saveAssistant(conversationId, emergency.message, 'emergency', [], safety.primary.ruleId, null);
      await this.convos.touch(conversationId, new Date().toISOString());
      return { message: toMessageDto(assistant), createdEventIds: [], assessmentId: null, emergency };
    }

    // 2. ENGINE — understand + extract.
    const ctx: ChatContext = {
      ageYears: ageFromDob(profile?.dateOfBirth ?? null),
      sexAtBirth: profile?.sexAtBirth ?? null,
      conditions: profile?.conditions ?? [],
    };
    const result = await this.engine.understand(content, ctx);

    // 3. Persist extracted events.
    const createdEventIds: string[] = [];
    for (const ev of result.events) {
      const saved = await this.tracking.create(user.id, ev);
      createdEventIds.push(saved.id);
    }

    // 4. Save + return the assistant reply.
    const assistant = await this.saveAssistant(conversationId, result.reply, result.intent, createdEventIds, null, result.model);
    await this.convos.touch(conversationId, new Date().toISOString());

    return { message: toMessageDto(assistant), createdEventIds, assessmentId: null, emergency: null };
  }

  private async saveAssistant(
    conversationId: string,
    content: string,
    intent: MessageRecord['intent'],
    eventIds: string[],
    safetyFlag: string | null,
    model: string | null,
  ): Promise<MessageRecord> {
    return this.convos.addMessage({
      id: randomUUID(),
      conversationId,
      role: 'assistant',
      content,
      intent,
      eventIds,
      safetyFlag,
      model,
      createdAt: new Date().toISOString(),
    });
  }
}
