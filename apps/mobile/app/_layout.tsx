import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LockGate } from '@/components/lock-gate';
import { AppLockProvider } from '@/providers/app-lock';
import { AuthProvider } from '@/providers/auth';
import { AppQueryProvider } from '@/providers/query';
import { ThemeProvider } from '@/providers/theme';

/**
 * Root layout: providers + the biometric lock gate wrap the whole navigator.
 * Auth-driven routing is handled by each route reading `useAuth()` (see app/index.tsx).
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppQueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppLockProvider>
              <StatusBar style="auto" />
              <LockGate>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="emergency" options={{ presentation: 'fullScreenModal' }} />
                </Stack>
              </LockGate>
            </AppLockProvider>
          </AuthProvider>
        </ThemeProvider>
      </AppQueryProvider>
    </SafeAreaProvider>
  );
}
