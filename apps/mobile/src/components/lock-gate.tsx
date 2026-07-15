import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { useAppLock } from '@/providers/app-lock';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { spacing } from '@/theme/tokens';

/**
 * Blocks all authenticated UI (onboarding + app) behind a biometric unlock. PHI must
 * never render while locked (docs/05 §5.7). The unauthenticated flow (sign-in) is not
 * gated — there's no PHI there yet.
 */
export function LockGate({ children }: { children: ReactNode }): ReactNode {
  const { status } = useAuth();
  const { locked, unlock } = useAppLock();
  const theme = useTheme();
  const attempted = useRef(false);

  const authed = status === 'onboarding' || status === 'ready';

  // Auto-prompt once when we first become authed-and-locked.
  useEffect(() => {
    if (authed && locked && !attempted.current) {
      attempted.current = true;
      void unlock();
    }
    if (!locked) attempted.current = false;
  }, [authed, locked, unlock]);

  if (authed && locked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <Text style={[styles.emoji]}>🔒</Text>
        <Text style={[styles.title, { color: theme.text }]}>Healthy Companion is locked</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          Unlock with Face ID, fingerprint, or your device passcode to continue.
        </Text>
        <Button title="Unlock" onPress={() => void unlock()} />
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emoji: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
