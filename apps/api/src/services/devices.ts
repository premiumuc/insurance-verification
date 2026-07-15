import { randomUUID } from 'node:crypto';
import type {
  ConnectDevice,
  DeviceConnection,
  DeviceVendor,
  MetricName,
  MetricSample,
  MetricSeries,
} from '@healthy-companion/types';
import type { DeviceConnectionRecord, MetricSampleRecord } from '../db/models.js';
import type { DeviceRepository, MetricRepository } from '../db/repositories.js';
import { AppError } from '../errors.js';
import type { WearableAggregator } from '../integrations/wearables.js';

function toDto(d: DeviceConnectionRecord): DeviceConnection {
  return {
    id: d.id,
    vendor: d.vendor as DeviceVendor,
    status: d.status,
    lastSyncedAt: d.lastSyncedAt,
    createdAt: d.createdAt,
  };
}

/** Bucket samples into daily averages for charting (server-side downsampling, docs/05 §5.8). */
function dailyAggregate(samples: MetricSampleRecord[]): MetricSeries['points'] {
  const byDay = new Map<string, { sum: number; n: number }>();
  for (const s of samples) {
    const day = s.ts.slice(0, 10);
    const b = byDay.get(day) ?? { sum: 0, n: 0 };
    b.sum += s.value;
    b.n += 1;
    byDay.set(day, b);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, b]) => ({ ts: `${day}T00:00:00.000Z`, value: Math.round((b.sum / b.n) * 100) / 100 }));
}

/** Device connections + metric ingestion/query (docs/03 §3.6, docs/07 §7.3). */
export class DeviceService {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly metrics: MetricRepository,
    private readonly aggregator: WearableAggregator,
  ) {}

  async list(userId: string): Promise<DeviceConnection[]> {
    return (await this.devices.listByUser(userId)).map(toDto);
  }

  async connect(userId: string, input: ConnectDevice): Promise<{ device: DeviceConnection; authUrl: string | null }> {
    const existing = await this.devices.findByVendor(userId, input.vendor);
    // On-device sources (Apple Health / Health Connect) don't use the aggregator OAuth.
    const onDevice = input.vendor === 'apple_health' || input.vendor === 'health_connect';

    let authUrl: string | null = null;
    let externalAccountId = input.externalAccountId ?? null;
    if (!onDevice) {
      const conn = await this.aggregator.startConnection(userId, input.vendor);
      authUrl = conn.authUrl;
      externalAccountId = conn.externalAccountId;
    }

    const record: DeviceConnectionRecord = existing
      ? await this.devices.update(existing.id, { status: 'connected', externalAccountId })
      : await this.devices.create({
          id: randomUUID(),
          userId,
          vendor: input.vendor,
          externalAccountId,
          accessToken: null,
          refreshToken: null,
          status: 'connected',
          lastSyncedAt: null,
          createdAt: new Date().toISOString(),
        });

    return { device: toDto(record), authUrl };
  }

  async disconnect(userId: string, id: string): Promise<void> {
    const d = await this.devices.findById(id);
    if (!d) throw AppError.notFound('Device not found');
    if (d.userId !== userId) throw AppError.forbidden();
    await this.devices.update(id, { status: 'disconnected' });
  }

  /** On-device push (HealthKit / Health Connect batch). */
  async ingest(userId: string, vendor: DeviceVendor, samples: MetricSample[]): Promise<number> {
    const device = await this.devices.findByVendor(userId, vendor);
    const records: MetricSampleRecord[] = samples.map((s) => ({
      userId,
      deviceConnectionId: device?.id ?? null,
      metric: s.metric,
      value: s.value,
      unit: s.unit,
      ts: s.ts,
      source: vendor,
    }));
    const n = await this.metrics.insertMany(records);
    if (device) await this.devices.update(device.id, { lastSyncedAt: new Date().toISOString() });
    return n;
  }

  /** Aggregator webhook ingestion (Terra/mock). Returns count ingested. */
  async ingestWebhook(signature: string | undefined, body: unknown): Promise<number> {
    const parsed = await this.aggregator.parseWebhook(signature, body);
    if (!parsed) throw AppError.validation('Invalid webhook payload');

    // Resolve the owning user from the external account id.
    // (In production a lookup table maps externalAccountId → device connection.)
    // For the mock, externalAccountId encodes the user: mock-<vendor>-<userId>.
    const match = parsed.externalAccountId.match(/^mock-[a-z_]+-(.+)$/);
    const userId = match?.[1];
    if (!userId) throw AppError.validation('Unknown external account');

    const records: MetricSampleRecord[] = parsed.samples.map((s) => ({
      userId,
      deviceConnectionId: null,
      metric: s.metric,
      value: s.value,
      unit: s.unit,
      ts: s.ts,
      source: 'aggregator',
    }));
    return this.metrics.insertMany(records);
  }

  async series(
    userId: string,
    metric: MetricName,
    from: string,
    to: string,
    agg: 'raw' | 'daily',
  ): Promise<MetricSeries> {
    const samples = await this.metrics.query(userId, metric, from, to);
    const unit = samples[0]?.unit ?? '';
    const points =
      agg === 'daily'
        ? dailyAggregate(samples)
        : samples.map((s) => ({ ts: s.ts, value: s.value }));
    return { metric, unit, points };
  }
}
