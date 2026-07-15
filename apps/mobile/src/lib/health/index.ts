import { Platform } from 'react-native';
import type { MetricSample } from '@healthy-companion/types';

/**
 * On-device health data adapter (docs/05 §5.1, docs/07 §7.3). The real implementations
 * read Apple HealthKit (react-native-health) and Android Health Connect
 * (react-native-health-connect) — both require an EAS dev/prod build with native
 * permissions, so they are stubbed here. The unified interface keeps the sync flow
 * source-agnostic: request permission, read recent samples, push to /devices/sync.
 */
export interface HealthAdapter {
  vendor: 'apple_health' | 'health_connect';
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  readRecentSamples(sinceISO: string): Promise<MetricSample[]>;
}

class StubHealthAdapter implements HealthAdapter {
  constructor(public readonly vendor: 'apple_health' | 'health_connect') {}
  async isAvailable() {
    return false; // native modules unavailable in Expo Go / web
  }
  async requestPermissions() {
    return false;
  }
  async readRecentSamples() {
    return [];
  }
}

/** Returns the platform's health adapter (stub until a native dev build is used). */
export function getHealthAdapter(): HealthAdapter {
  return Platform.OS === 'ios'
    ? new StubHealthAdapter('apple_health')
    : new StubHealthAdapter('health_connect');
}
