import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppQueryProvider } from '@/providers/query';
import { ThemeProvider } from '@/providers/theme';

/**
 * Root layout: wraps the whole app in theme + server-state providers.
 * The biometric app-lock gate and auth routing are added in M1.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppQueryProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="emergency" options={{ presentation: 'fullScreenModal' }} />
          </Stack>
        </ThemeProvider>
      </AppQueryProvider>
    </SafeAreaProvider>
  );
}
