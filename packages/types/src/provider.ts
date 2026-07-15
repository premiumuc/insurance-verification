import { z } from 'zod';
import { IdSchema } from './common.js';

/** Provider discovery (docs/04, docs/07 §7.4). Directory data — not PHI. */
export const ProviderTypeSchema = z.enum([
  'physician',
  'dentist',
  'specialist',
  'urgent_care',
  'pharmacy',
  'mental_health',
  'wellness',
  'community_clinic',
]);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

export const ProviderSchema = z.object({
  id: IdSchema,
  npi: z.string().nullable(),
  name: z.string(),
  type: ProviderTypeSchema,
  specialty: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  distanceKm: z.number().nullable(),
  inNetwork: z.boolean().nullable(),
  affordableOption: z.boolean(),
});
export type Provider = z.infer<typeof ProviderSchema>;

export const ProviderSearchResultSchema = z.object({
  items: z.array(ProviderSchema),
});
export type ProviderSearchResult = z.infer<typeof ProviderSearchResultSchema>;
