import type { RedFlagRule } from './types.js';

/**
 * The red-flag ruleset.
 *
 * High-recall by design. Each rule is scoped to acute, time-critical presentations that
 * warrant immediate emergency routing. This is a STARTING corpus for M0 — it is expected
 * to be reviewed and expanded with clinical input (tracked in docs/07 and docs/09).
 *
 * IMPORTANT: messages are calm, short, and action-oriented. They never diagnose; they
 * tell the user what to do right now.
 */
export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'cardiac.chest_pain',
    severity: 'emergency',
    category: 'Possible cardiac emergency',
    message:
      'Chest pain or pressure can be a medical emergency. Call 911 or go to the nearest emergency room now.',
    actions: ['call_911', 'find_nearest_er'],
    triggers: [
      /\bchest (pain|pressure|tightness|tight)\b/i,
      /\bpain (in|across) (my )?chest\b/i,
      /\bcrushing (chest|feeling)\b/i,
      /\bheart attack\b/i,
      /\bpressure (in|on) my chest\b/i,
    ],
    negations: [/\bno chest pain\b/i, /\bdenies chest pain\b/i, /\bwithout chest pain\b/i],
  },
  {
    id: 'stroke.fast',
    severity: 'emergency',
    category: 'Possible stroke (FAST)',
    message:
      'These can be signs of a stroke. Every minute matters — call 911 immediately.',
    actions: ['call_911', 'find_nearest_er'],
    triggers: [
      /\bstroke\b/i,
      /\bface (is )?droop/i,
      /\bslurred speech\b/i,
      /\bcan'?t speak\b/i,
      /\bnumbness (on )?one side\b/i,
      /\bweak(ness)? (on|in) one side\b/i,
      /\bsudden (vision loss|confusion|numbness)\b/i,
      /\barm (is )?(weak|numb) (on )?one side\b/i,
    ],
  },
  {
    id: 'respiratory.severe',
    severity: 'emergency',
    category: 'Severe breathing difficulty',
    message:
      'Trouble breathing can be an emergency. Call 911 or go to the nearest emergency room now.',
    actions: ['call_911', 'find_nearest_er'],
    triggers: [
      /\bcan'?t breathe\b/i,
      /\bcannot breathe\b/i,
      /\bstruggling to breathe\b/i,
      /\bgasping for (air|breath)\b/i,
      /\bstopped breathing\b/i,
      /\bturning blue\b/i,
      /\bchoking\b/i,
    ],
    negations: [/\bcan breathe (fine|ok|okay)\b/i],
  },
  {
    id: 'allergy.anaphylaxis',
    severity: 'emergency',
    category: 'Possible severe allergic reaction',
    message:
      'A severe allergic reaction is life-threatening. Use an epinephrine auto-injector if you have one and call 911 now.',
    actions: ['call_911', 'find_nearest_er'],
    triggers: [
      /\banaphylax/i,
      /\bthroat (is )?(closing|swelling|tight)\b/i,
      /\btongue swelling\b/i,
      /\bsevere allergic reaction\b/i,
      /\bhives all over\b.*\b(breath|throat|swell)/i,
    ],
  },
  {
    id: 'bleeding.severe',
    severity: 'emergency',
    category: 'Severe bleeding',
    message:
      'Uncontrolled bleeding is an emergency. Apply firm pressure and call 911 now.',
    actions: ['call_911', 'find_nearest_er'],
    triggers: [
      /\bbleeding (won'?t|will not|can'?t) stop\b/i,
      /\buncontrolled bleeding\b/i,
      /\bbleeding heavily\b/i,
      /\bcoughing up blood\b/i,
      /\bvomiting blood\b/i,
    ],
  },
  {
    id: 'neuro.altered',
    severity: 'emergency',
    category: 'Altered consciousness / seizure',
    message:
      'Loss of consciousness or a seizure needs emergency care. Call 911 now.',
    actions: ['call_911', 'find_nearest_er'],
    triggers: [
      /\bunconscious\b/i,
      /\bpassed out\b/i,
      /\bfainted and (won'?t|didn'?t) wake\b/i,
      /\bseizure\b/i,
      /\bconvulsion/i,
      /\bunresponsive\b/i,
    ],
  },
  {
    id: 'poisoning.overdose',
    severity: 'emergency',
    category: 'Poisoning / overdose',
    message:
      'This may be a poisoning or overdose. Call Poison Control (1-800-222-1222 in the US) or 911 right away.',
    actions: ['call_poison_control', 'call_911', 'find_nearest_er'],
    triggers: [
      /\boverdose\b/i,
      /\btook too many (pills|tablets)\b/i,
      /\bpoison(ed|ing)?\b/i,
      /\bswallowed (bleach|chemical|poison)\b/i,
    ],
  },
  {
    id: 'mental_health.suicidal',
    severity: 'emergency',
    category: 'Mental health crisis',
    message:
      "You're not alone and help is available right now. Call or text 988 (US Suicide & Crisis Lifeline). If you are in immediate danger, call 911.",
    actions: ['call_988', 'call_911'],
    triggers: [
      /\bkill myself\b/i,
      /\bsuicid/i,
      /\bend my life\b/i,
      /\bwant to die\b/i,
      /\bharm myself\b/i,
      /\bhurt myself\b/i,
      /\bno reason to live\b/i,
    ],
    negations: [/\bdon'?t want to (kill myself|die|hurt myself)\b/i],
  },
  {
    id: 'obstetric.emergency',
    severity: 'emergency',
    category: 'Pregnancy emergency',
    message:
      'Heavy bleeding or severe pain in pregnancy needs emergency care. Call 911 or go to the nearest emergency room now.',
    actions: ['call_911', 'find_nearest_er'],
    triggers: [
      /\b(heavy|severe) bleeding\b.*\bpregnan/i,
      /\bpregnan.*\b(heavy|severe) bleeding\b/i,
      /\bwater broke\b.*\b(bleeding|pain)\b/i,
      /\bcontractions\b.*\bbleeding\b/i,
    ],
  },
];
