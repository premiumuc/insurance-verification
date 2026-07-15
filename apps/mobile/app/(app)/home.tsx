import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { evaluate } from '@healthy-companion/safety-rules';
import { Body, Button, Screen, Title } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/**
 * Authenticated home. A placeholder for the M7 Daily Use Loop — for now it greets the
 * user and demonstrates the on-device safety gate (instant emergency banner from the
 * shared ruleset; the server remains authoritative). The real tracking dashboard lands
 * in M2.
 */
export default function Home() {
  const theme = useTheme();
  const { me, signOut } = useAuth();
  const [text, setText] = useState('');

  const safety = useMemo(() => (text.trim() ? evaluate(text) : null), [text]);
  const name = me?.profile.firstName ?? 'there';

  return (
    <Screen>
      <Text style={[styles.kicker, { color: theme.brand }]}>Healthy Companion</Text>
      <Title>Hi {name} 👋</Title>
      <Body>
        You're all set up. Tracking, your daily check-in, and guidance arrive in the next
        milestones. For now, here's your safety gate — it works even offline.
      </Body>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>How are you feeling?</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Describe a symptom…"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          multiline
          accessibilityLabel="Health message input"
        />

        {safety?.escalate && safety.primary ? (
          <View style={[styles.emergency, { backgroundColor: theme.emergency }]}>
            <Text style={styles.emergencyTitle}>{safety.primary.category}</Text>
            <Text style={styles.emergencyBody}>{safety.primary.message}</Text>
            <Link href="/emergency" asChild>
              <TouchableOpacity style={styles.emergencyBtn} accessibilityRole="button">
                <Text style={styles.emergencyBtnText}>Open emergency guidance</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : safety ? (
          <Text style={[styles.ok, { color: theme.success }]}>No red flags detected.</Text>
        ) : null}
      </View>

      <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardLabel: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 64, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, fontSize: 16 },
  emergency: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  emergencyTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  emergencyBody: { color: '#fff', fontSize: 14, lineHeight: 20 },
  emergencyBtn: { backgroundColor: '#fff', borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  emergencyBtnText: { color: '#C1121F', fontWeight: '800' },
  ok: { fontSize: 14, fontWeight: '600' },
});
