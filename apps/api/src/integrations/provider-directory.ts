import type { Provider, ProviderType } from '@healthy-companion/types';

export interface ProviderSearchParams {
  query?: string;
  type?: ProviderType;
  insurance?: string;
  limit: number;
}

/**
 * Provider directory boundary (docs/07 §7.4). Production sources NPPES (NPI registry)
 * plus payer network APIs for in/out-of-network status. This interface keeps search
 * source-agnostic.
 */
export interface ProviderDirectory {
  search(params: ProviderSearchParams): Promise<Provider[]>;
  get(id: string): Promise<Provider | null>;
}

const SEED: Provider[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    npi: '1234567890',
    name: 'Riverside Family Medicine',
    type: 'physician',
    specialty: 'Family Medicine',
    address: '100 Main St',
    phone: '555-0100',
    distanceKm: 2.1,
    inNetwork: true,
    affordableOption: false,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    npi: '2345678901',
    name: 'Downtown Urgent Care',
    type: 'urgent_care',
    specialty: null,
    address: '200 Oak Ave',
    phone: '555-0200',
    distanceKm: 3.4,
    inNetwork: false,
    affordableOption: false,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    npi: null,
    name: 'Community Wellness Clinic (sliding scale)',
    type: 'community_clinic',
    specialty: 'Primary care',
    address: '15 Elm St',
    phone: '555-0300',
    distanceKm: 5.0,
    inNetwork: null,
    affordableOption: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    npi: '4567890123',
    name: 'Mindful Counseling Associates',
    type: 'mental_health',
    specialty: 'Therapy & counseling',
    address: '42 Pine Rd',
    phone: '555-0400',
    distanceKm: 4.2,
    inNetwork: true,
    affordableOption: false,
  },
];

/** Deterministic mock directory for dev/test (in-memory seed). */
export class MockProviderDirectory implements ProviderDirectory {
  async search(params: ProviderSearchParams): Promise<Provider[]> {
    let rows = SEED;
    if (params.type) rows = rows.filter((p) => p.type === params.type);
    if (params.query) {
      const q = params.query.toLowerCase();
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.specialty ?? '').toLowerCase().includes(q),
      );
    }
    return rows.slice(0, params.limit).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }
  async get(id: string): Promise<Provider | null> {
    return SEED.find((p) => p.id === id) ?? null;
  }
}
