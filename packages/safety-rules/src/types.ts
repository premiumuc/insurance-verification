/**
 * Types for the deterministic emergency red-flag engine.
 *
 * Kept dependency-free so this module runs identically in React Native and Node.
 */

/** How urgent a matched red flag is. */
export type Severity = 'emergency' | 'urgent';

/**
 * Concrete actions the UI must surface when a red flag matches.
 * These map to first-class, one-tap actions on the emergency screen.
 */
export type EmergencyAction =
  | 'call_911'
  | 'find_nearest_er'
  | 'call_988' // US Suicide & Crisis Lifeline
  | 'call_poison_control'
  | 'seek_urgent_care';

/** A single detected red flag. */
export interface RedFlagMatch {
  ruleId: string;
  severity: Severity;
  /** Human-readable category, e.g. "Cardiac", "Stroke (FAST)". */
  category: string;
  /** The phrase(s) in the input that triggered the rule (for audit, not for the user). */
  matchedTerms: string[];
  /** Short, calm, actionable guidance shown to the user. */
  message: string;
  actions: EmergencyAction[];
}

/**
 * Optional structured context. The engine works on text alone, but context can raise
 * confidence (e.g. a known cardiac history). Context NEVER downgrades an emergency.
 */
export interface SafetyContext {
  ageYears?: number;
  isPregnant?: boolean;
  knownConditions?: string[];
}

/** Result of evaluating an input. */
export interface SafetyEvaluation {
  /** True if any emergency-severity rule matched — the client MUST route to /emergency. */
  escalate: boolean;
  /** Highest severity among matches, or null when nothing matched. */
  topSeverity: Severity | null;
  /** All matches, sorted by severity (emergency first). */
  matches: RedFlagMatch[];
  /** The single most severe match to render prominently, or null. */
  primary: RedFlagMatch | null;
}

/**
 * A trigger pattern. Strings are matched as whole-word, case-insensitive substrings;
 * RegExp is matched as-is (author is responsible for word boundaries).
 */
export type Trigger = string | RegExp;

export interface RedFlagRule {
  id: string;
  severity: Severity;
  category: string;
  message: string;
  actions: EmergencyAction[];
  /** Any trigger match fires the rule... */
  triggers: Trigger[];
  /**
   * ...unless a negation pattern also matches (e.g. "no chest pain", "denies chest
   * pain"). Kept conservative — we only negate explicit denials, never soft hedges.
   */
  negations?: Trigger[];
}
