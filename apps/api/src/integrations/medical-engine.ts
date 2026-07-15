import type { AssessmentResult } from '@healthy-companion/types';

/** Context passed to the medical engine (data-minimized; docs/06 T2). */
export interface MedicalContext {
  ageYears?: number;
  sexAtBirth?: string | null;
  conditions?: string[];
}

/**
 * The vetted, medically-trained assessment engine (docs/07 §7.1). We do NOT home-grow
 * clinical inference — this is a boundary over a third-party vetted vendor (Infermedica
 * assumed). Output is ALWAYS possibilities + triage, never a diagnosis.
 */
export interface MedicalEngine {
  readonly name: string;
  assess(symptoms: string[], ctx: MedicalContext): Promise<AssessmentResult>;
}

/**
 * Deterministic mock engine for dev/test. Maps a few common symptoms to conservative,
 * clearly-non-diagnostic possibilities and a sensible triage. Production swaps in
 * InfermedicaEngine (below) behind the same interface.
 */
export class MockMedicalEngine implements MedicalEngine {
  readonly name = 'mock-v1';

  async assess(symptoms: string[], _ctx: MedicalContext): Promise<AssessmentResult> {
    const s = symptoms.map((x) => x.toLowerCase());
    const has = (w: string) => s.some((x) => x.includes(w));

    const possibilities = [];
    let triage: AssessmentResult['triage'] = 'self_care';

    if (has('headache')) {
      possibilities.push(
        { name: 'Tension-type headache', likelihood: 0.6, commonName: 'Tension headache' },
        { name: 'Dehydration', likelihood: 0.3, commonName: 'Dehydration' },
        { name: 'Migraine', likelihood: 0.2, commonName: 'Migraine' },
      );
      triage = 'self_care';
    }
    if (has('fever') || has('cough') || has('sore throat')) {
      possibilities.push(
        { name: 'Viral upper respiratory infection', likelihood: 0.6, commonName: 'Common cold' },
        { name: 'Influenza', likelihood: 0.25, commonName: 'Flu' },
      );
      triage = 'consult_soon';
    }
    if (has('abdominal') || has('stomach')) {
      possibilities.push({ name: 'Gastroenteritis', likelihood: 0.5, commonName: 'Stomach bug' });
      triage = 'consult_soon';
    }
    if (possibilities.length === 0) {
      possibilities.push({ name: 'Non-specific symptoms', likelihood: 0.4, commonName: null });
    }

    return {
      triage,
      possibilities,
      advice:
        triage === 'self_care'
          ? 'Rest, hydrate, and monitor how you feel. Keep logging so you can spot patterns.'
          : 'Consider reaching out to a provider if this continues or worsens.',
    };
  }
}

/**
 * Production engine: Infermedica (or equivalent). Sketched with the real request shape;
 * requires an API key + BAA (docs/06). Not exercised in tests.
 */
export interface InfermedicaConfig {
  baseUrl: string;
  appId: string;
  appKey: string;
}

export class InfermedicaEngine implements MedicalEngine {
  readonly name = 'infermedica';
  constructor(private readonly config: InfermedicaConfig) {}

  async assess(symptoms: string[], ctx: MedicalContext): Promise<AssessmentResult> {
    // Real flow: /parse symptoms → evidence, then /diagnosis with age/sex/evidence,
    // then /triage. Mapped to our non-diagnostic AssessmentResult. Implementation calls
    // the vendor over HTTPS with the configured credentials.
    const res = await fetch(`${this.config.baseUrl}/diagnosis`, {
      method: 'POST',
      headers: {
        'App-Id': this.config.appId,
        'App-Key': this.config.appKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sex: ctx.sexAtBirth === 'female' ? 'female' : 'male',
        age: { value: ctx.ageYears ?? 30 },
        evidence: symptoms.map((id) => ({ id, choice_id: 'present' })),
      }),
    });
    if (!res.ok) throw new Error(`Infermedica error ${res.status}`);
    const data = (await res.json()) as {
      conditions?: Array<{ name: string; probability: number; common_name?: string }>;
    };
    const possibilities = (data.conditions ?? []).slice(0, 5).map((c) => ({
      name: c.name,
      likelihood: c.probability,
      commonName: c.common_name ?? null,
    }));
    return {
      triage: 'consult_soon',
      possibilities,
      advice: 'These are possibilities based on what you shared. A provider can help confirm.',
    };
  }
}
