/**
 * @healthy-companion/safety-rules
 *
 * Deterministic emergency red-flag detection. Runs before any LLM, on client and server.
 * See README.md — safety-critical, high-recall by design.
 */
import { RED_FLAG_RULES } from './rules.js';
import type {
  RedFlagMatch,
  RedFlagRule,
  SafetyContext,
  SafetyEvaluation,
  Severity,
  Trigger,
} from './types.js';

export * from './types.js';
export { RED_FLAG_RULES } from './rules.js';

const SEVERITY_ORDER: Record<Severity, number> = { emergency: 0, urgent: 1 };

/**
 * Normalize input for matching: lower-case, collapse whitespace, and strip characters
 * that users commonly insert but that shouldn't defeat matching. We keep it minimal to
 * avoid changing meaning.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'") // smart quotes → '
    .replace(/\s+/g, ' ')
    .trim();
}

function triggerMatches(trigger: Trigger, normalized: string): string | null {
  if (typeof trigger === 'string') {
    const needle = normalize(trigger);
    // whole-word-ish: bounded by non-word chars or string edges
    const re = new RegExp(`(?:^|\\W)${escapeRegExp(needle)}(?:\\W|$)`, 'i');
    return re.test(normalized) ? trigger : null;
  }
  const m = normalized.match(trigger);
  return m ? m[0] : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ruleMatches(rule: RedFlagRule, normalized: string): string[] | null {
  const matched: string[] = [];
  for (const trigger of rule.triggers) {
    const hit = triggerMatches(trigger, normalized);
    if (hit) matched.push(hit);
  }
  if (matched.length === 0) return null;

  // Explicit negations veto the match (e.g. "no chest pain").
  if (rule.negations) {
    for (const neg of rule.negations) {
      if (triggerMatches(neg, normalized)) return null;
    }
  }
  return matched;
}

/**
 * Evaluate free text (and optional context) for acute red flags.
 *
 * Deterministic and side-effect-free. `context` may only ever RAISE urgency, never lower
 * it — for M0 it is accepted but not yet used to upgrade matches; the signature is stable
 * so callers can pass it today.
 */
export function evaluate(text: string, _context?: SafetyContext): SafetyEvaluation {
  const normalized = normalize(text ?? '');
  const matches: RedFlagMatch[] = [];

  for (const rule of RED_FLAG_RULES) {
    const matchedTerms = ruleMatches(rule, normalized);
    if (matchedTerms) {
      matches.push({
        ruleId: rule.id,
        severity: rule.severity,
        category: rule.category,
        matchedTerms,
        message: rule.message,
        actions: rule.actions,
      });
    }
  }

  matches.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const primary = matches[0] ?? null;
  return {
    escalate: matches.some((m) => m.severity === 'emergency'),
    topSeverity: primary?.severity ?? null,
    matches,
    primary,
  };
}
