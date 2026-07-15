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
  // Runtime version gates OTA updates to compatible native builds (EAS Update).
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/REPLACE_WITH_EAS_PROJECT_ID',
    fallbackToCacheTimeout: 0,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.healthycompanion.mobile',
    infoPlist: {
      // App Store review requires clear, specific health-data usage strings.
      NSHealthShareUsageDescription:
        'Healthy Companion reads your health data (steps, heart rate, sleep) to give you personalized, non-clinical guidance.',
      NSHealthUpdateUsageDescription:
        'Healthy Companion can save health data you log back to Apple Health.',
      NSFaceIDUsageDescription: 'Face ID unlocks the app so your health data stays private.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.healthycompanion.mobile',
    permissions: [
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_HEART_RATE',
      'android.permission.health.READ_SLEEP',
      'android.permission.USE_BIOMETRIC',
      'android.permission.POST_NOTIFICATIONS',
    ],
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
    eas: { projectId: 'REPLACE_WITH_EAS_PROJECT_ID' },
  },
};

export default config;
