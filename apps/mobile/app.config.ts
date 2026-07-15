import type { ExpoConfig } from 'expo/config';

/**
 * Expo app config. Native permission strings for HealthKit / Health Connect and the
 * config plugins for the health bridges are added in M5 (device integration). Kept
 * minimal for the M0 skeleton.
 */
const config: ExpoConfig = {
  name: 'Healthy Companion',
  slug: 'healthy-companion',
  scheme: 'healthycompanion',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.healthycompanion.mobile',
  },
  android: {
    package: 'app.healthycompanion.mobile',
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-local-authentication'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Overridden per-environment via EAS build profiles.
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/v1',
  },
};

export default config;
