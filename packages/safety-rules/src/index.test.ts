import { describe, expect, it } from 'vitest';
import { evaluate, normalize, RED_FLAG_RULES } from './index.js';

describe('normalize', () => {
  it('lowercases, collapses whitespace, trims', () => {
    expect(normalize('  Chest   PAIN  ')).toBe('chest pain');
  });
  it('converts smart quotes', () => {
    expect(normalize('can’t breathe')).toBe("can't breathe");
  });
});

describe('emergency escalation — must-escalate corpus', () => {
  const MUST_ESCALATE: Array<[string, string]> = [
    ['I have crushing chest pain radiating to my arm', 'cardiac.chest_pain'],
    ['pressure in my chest and sweating', 'cardiac.chest_pain'],
    ['I think my dad is having a heart attack', 'cardiac.chest_pain'],
    ['her face is drooping and speech is slurred', 'stroke.fast'],
    ['sudden numbness on one side of my body', 'stroke.fast'],
    ['I think this is a stroke', 'stroke.fast'],
    ["I can't breathe", 'respiratory.severe'],
    ['he is gasping for air', 'respiratory.severe'],
    ['my child is choking', 'respiratory.severe'],
    ['my throat is closing after eating peanuts', 'allergy.anaphylaxis'],
    ['this looks like anaphylaxis', 'allergy.anaphylaxis'],
    ["the bleeding won't stop", 'bleeding.severe'],
    ['I am coughing up blood', 'bleeding.severe'],
    ['he had a seizure and is unresponsive', 'neuro.altered'],
    ['she passed out and is unconscious', 'neuro.altered'],
    ['I took an overdose of pills', 'poisoning.overdose'],
    ['my son swallowed bleach', 'poisoning.overdose'],
    ['I want to kill myself', 'mental_health.suicidal'],
    ['I have been thinking about suicide', 'mental_health.suicidal'],
    ['I am pregnant and have heavy bleeding', 'obstetric.emergency'],
  ];

  it.each(MUST_ESCALATE)('escalates: "%s"', (text, expectedRuleId) => {
    const result = evaluate(text);
    expect(result.escalate).toBe(true);
    expect(result.topSeverity).toBe('emergency');
    expect(result.matches.map((m) => m.ruleId)).toContain(expectedRuleId);
    expect(result.primary).not.toBeNull();
    expect(result.primary?.actions.length).toBeGreaterThan(0);
  });
});

describe('negations — must NOT escalate', () => {
  const MUST_NOT_ESCALATE = [
    'I have no chest pain, just a mild cough',
    'patient denies chest pain',
    "I don't want to kill myself, I'm just tired",
    'I can breathe fine now, it passed',
    'I logged a headache and drank water',
    'feeling a bit low energy today',
    'my sleep was 7 hours last night',
    'took my morning vitamins',
    '',
  ];

  it.each(MUST_NOT_ESCALATE)('does not escalate: "%s"', (text) => {
    const result = evaluate(text);
    expect(result.escalate).toBe(false);
  });
});

describe('rule integrity', () => {
  it('every rule has an id, message, at least one trigger and one action', () => {
    for (const rule of RED_FLAG_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.message.length).toBeGreaterThan(10);
      expect(rule.triggers.length).toBeGreaterThan(0);
      expect(rule.actions.length).toBeGreaterThan(0);
    }
  });

  it('rule ids are unique', () => {
    const ids = RED_FLAG_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts matches with emergency first', () => {
    const result = evaluate('chest pain and I want to die');
    expect(result.matches.length).toBeGreaterThanOrEqual(2);
    expect(result.matches[0]?.severity).toBe('emergency');
  });
});
