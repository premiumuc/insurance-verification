import type { MetricSample } from '@healthy-companion/types';

/**
 * Wearable aggregator boundary (docs/07 §7.3). An aggregator (Terra/Rook/Spike) unifies
 * Fitbit/Garmin/Oura/Whoop/Dexcom/Libre behind one OAuth + webhook surface. This
 * interface lets us swap vendors without touching services.
 */
export interface WearableAggregator {
  /** Begin an OAuth connection; returns a URL the client opens (or a stub in dev). */
  startConnection(userId: string, vendor: string): Promise<{ authUrl: string; externalAccountId: string }>;
  /** Verify + normalize an inbound webhook body into canonical samples. */
  parseWebhook(signature: string | undefined, body: unknown): Promise<{ externalAccountId: string; samples: MetricSample[] } | null>;
}

/**
 * Deterministic dev/test aggregator. No network. `parseWebhook` accepts an already
 * normalized `{ externalAccountId, samples }` body so the ingestion path is testable.
 * Production uses a real TerraAggregator implementing the same interface.
 */
export class MockAggregator implements WearableAggregator {
  async startConnection(userId: string, vendor: string) {
    return {
      authUrl: `https://example.invalid/connect/${vendor}?u=${userId}`,
      externalAccountId: `mock-${vendor}-${userId}`,
    };
  }

  async parseWebhook(_signature: string | undefined, body: unknown) {
    const parsed = body as { externalAccountId?: string; samples?: MetricSample[] } | null;
    if (!parsed?.externalAccountId || !Array.isArray(parsed.samples)) return null;
    return { externalAccountId: parsed.externalAccountId, samples: parsed.samples };
  }
}
