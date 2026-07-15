import type { CreateHealthEvent } from '@healthy-companion/types';
import { NON_DIAGNOSTIC_DISCLAIMER, type ChatContext, type ChatEngine, type EngineResult } from './engine.js';

/**
 * Deterministic local engine. Extracts common structured events with regexes and
 * produces safe, templated, non-diagnostic replies. It exists so the whole conversational
 * flow runs and is testable without Bedrock — and so tests are deterministic. Production
 * uses BedrockChatEngine (Claude).
 */
const SYMPTOM_WORDS = [
  'headache',
  'migraine',
  'nausea',
  'nauseous',
  'fever',
  'cough',
  'sore throat',
  'dizzy',
  'dizziness',
  'fatigue',
  'tired',
  'cramps',
  'back pain',
  'stomach ache',
  'stomachache',
];

const MOOD_MAP: Array<[RegExp, number]> = [
  [/\b(great|amazing|fantastic|wonderful)\b/i, 9],
  [/\b(good|happy|fine|okay|ok)\b/i, 7],
  [/\b(meh|so-so|tired)\b/i, 5],
  [/\b(bad|down|low|sad|stressed|anxious)\b/i, 3],
  [/\b(terrible|awful|depressed|hopeless)\b/i, 1],
];

function extractEvents(message: string): CreateHealthEvent[] {
  const events: CreateHealthEvent[] = [];
  const text = message.toLowerCase();

  // Water: "drank 500 ml", "500ml water", "2 glasses of water"
  const ml = text.match(/(\d+)\s?ml\b/);
  const glasses = text.match(/(\d+)\s?(glass|glasses|cups?)\b/);
  if (ml?.[1]) events.push({ type: 'water', source: 'chat', data: { volumeMl: Number(ml[1]) } });
  else if (glasses?.[1] && /water/.test(text))
    events.push({ type: 'water', source: 'chat', data: { volumeMl: Number(glasses[1]) * 250 } });

  // Sleep: "slept 7 hours", "7 hrs of sleep"
  const sleep = text.match(/(\d+(?:\.\d+)?)\s?(hours?|hrs?)\b/);
  if (sleep?.[1] && /sle(ep|pt)/.test(text))
    events.push({ type: 'sleep', source: 'chat', data: { durationMinutes: Math.round(Number(sleep[1]) * 60) } });

  // Weight: "weigh 70 kg", "170 lb"
  const kg = text.match(/(\d+(?:\.\d+)?)\s?kg\b/);
  const lb = text.match(/(\d+(?:\.\d+)?)\s?(lb|lbs|pounds)\b/);
  if (kg?.[1] && /weigh/.test(text)) events.push({ type: 'weight', source: 'chat', data: { kg: Number(kg[1]) } });
  else if (lb?.[1] && /weigh/.test(text))
    events.push({ type: 'weight', source: 'chat', data: { kg: Math.round(Number(lb[1]) * 0.4536 * 10) / 10 } });

  // Symptom
  const foundSymptom = SYMPTOM_WORDS.find((w) => text.includes(w));
  if (foundSymptom) events.push({ type: 'symptom', source: 'chat', data: { label: foundSymptom } });

  // Mood: only when the user is describing feelings, not asking
  if (/\b(feel|feeling|mood|i am|i'm)\b/.test(text)) {
    for (const [re, score] of MOOD_MAP) {
      if (re.test(text)) {
        events.push({ type: 'mood', source: 'chat', data: { score } });
        break;
      }
    }
  }

  return events;
}

function isQuestion(message: string): boolean {
  return /\?\s*$/.test(message.trim()) || /^(what|why|how|should|can|is|are|do|does|could|when)\b/i.test(message.trim());
}

export class LocalChatEngine implements ChatEngine {
  async understand(message: string, _ctx: ChatContext): Promise<EngineResult> {
    const events = extractEvents(message);
    const asked = isQuestion(message);
    const intent: EngineResult['intent'] = events.length && asked ? 'both' : asked ? 'ask' : events.length ? 'log' : 'ask';

    let reply: string;
    if (events.length && !asked) {
      const kinds = [...new Set(events.map((e) => e.type))].join(', ');
      reply = `Got it — I've noted your ${kinds}. It'll show up on your dashboard. Anything else you'd like to add?`;
    } else if (asked) {
      reply = `Thanks for sharing. I can help you keep track and spot patterns over time. ${NON_DIAGNOSTIC_DISCLAIMER}`;
    } else {
      reply = `I'm here with you. Tell me how you're feeling or what you'd like to log, and I'll keep good notes.`;
    }

    return { intent, reply, events, model: 'local-heuristic-v1' };
  }
}
