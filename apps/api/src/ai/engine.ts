import type { CreateHealthEvent, MessageIntent } from '@healthy-companion/types';

/** Minimal, data-minimized context passed to the AI layer (docs/06 T2). */
export interface ChatContext {
  ageYears?: number;
  sexAtBirth?: string | null;
  conditions?: string[];
}

export interface EngineResult {
  /** Whether this turn was a log, a question, both, or neither (treated as 'ask'). */
  intent: Exclude<MessageIntent, 'emergency'>;
  /** The assistant's natural-language reply. Always non-diagnostic. */
  reply: string;
  /** Structured events extracted from the message, to be persisted. */
  events: CreateHealthEvent[];
  /** Identifier of the model/engine that produced this result (for the audit trail). */
  model: string;
}

/**
 * The conversational brain (docs/07 §7.1). Responsible for understanding, structured
 * extraction, and composing a contextual reply — NOT for emergency detection (that is
 * the deterministic Safety Gate, which runs before this) and NOT for clinical
 * assessment (that is the medical engine, M6).
 */
export interface ChatEngine {
  understand(message: string, ctx: ChatContext): Promise<EngineResult>;
}

/** Standard non-diagnostic disclaimer appended to guidance replies. */
export const NON_DIAGNOSTIC_DISCLAIMER =
  'This is general information, not a diagnosis. If you’re worried, please talk to a healthcare professional.';
