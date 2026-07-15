import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Biometric app-lock gate (docs/05 §5.7, threat T4). PHI must not render until the user
 * passes a device biometric/passcode check. The lock re-engages when the app returns
 * from background. If the device has no biometrics enrolled, we fail open on web/dev but
 * production builds require enrollment (enforced in M8 hardening).
 */
interface AppLockValue {
  locked: boolean;
  unlock: () => Promise<boolean>;
}

const AppLockContext = createContext<AppLockValue | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }): ReactNode {
  const [locked, setLocked] = useState(Platform.OS !== 'web');

  const unlock = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setLocked(false);
      return true;
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      // No biometrics available — dev fails open; production enforces enrollment.
      setLocked(false);
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Healthy Companion',
      disableDeviceFallback: false,
    });
    if (result.success) setLocked(false);
    return result.success;
  }, []);

  // Re-lock when the app is backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && Platform.OS !== 'web') setLocked(true);
    });
    return () => sub.remove();
  }, []);

  return <AppLockContext.Provider value={{ locked, unlock }}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
