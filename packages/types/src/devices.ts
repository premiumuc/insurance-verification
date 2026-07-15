import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

/** Supported data sources (docs/03 §3.6, docs/07 §7.3). Google Fit → Health Connect. */
export const DeviceVendorSchema = z.enum([
  'apple_health',
  'health_connect',
  'dexcom',
  'libre',
  'fitbit',
  'garmin',
  'oura',
  'whoop',
  'terra',
]);
export type DeviceVendor = z.infer<typeof DeviceVendorSchema>;

export const MetricNameSchema = z.enum([
  'steps',
  'heart_rate',
  'hrv',
  'sleep_minutes',
  'spo2',
  'glucose',
  'bp_systolic',
  'bp_diastolic',
  'weight',
  'calories',
  'uv',
]);
export type MetricName = z.infer<typeof MetricNameSchema>;

export const DeviceConnectionSchema = z.object({
  id: IdSchema,
  vendor: DeviceVendorSchema,
  status: z.enum(['connected', 'disconnected', 'error']),
  lastSyncedAt: TimestampSchema.nullable(),
  createdAt: TimestampSchema,
});
export type DeviceConnection = z.infer<typeof DeviceConnectionSchema>;

export const ConnectDeviceSchema = z.object({
  vendor: DeviceVendorSchema,
  /** OAuth code / external account reference from the vendor or aggregator flow. */
  externalAccountId: z.string().max(200).optional(),
});
export type ConnectDevice = z.infer<typeof ConnectDeviceSchema>;

/** A single normalized metric sample. */
export const MetricSampleSchema = z.object({
  metric: MetricNameSchema,
  value: z.number(),
  unit: z.string(),
  ts: TimestampSchema,
});
export type MetricSample = z.infer<typeof MetricSampleSchema>;

/** On-device (HealthKit / Health Connect) push, or normalized aggregator payload. */
export const SyncSamplesSchema = z.object({
  vendor: DeviceVendorSchema,
  samples: z.array(MetricSampleSchema).max(5000),
});
export type SyncSamples = z.infer<typeof SyncSamplesSchema>;

export const MetricSeriesSchema = z.object({
  metric: MetricNameSchema,
  unit: z.string(),
  points: z.array(z.object({ ts: TimestampSchema, value: z.number() })),
});
export type MetricSeries = z.infer<typeof MetricSeriesSchema>;
