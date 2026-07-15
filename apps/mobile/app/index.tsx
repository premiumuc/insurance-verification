import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { evaluate } from '@healthy-companion/safety-rules';
import { useTheme } from '@/providers/theme';
import { spacing, radius } from '@/theme/tokens';

/**
 * M0 placeholder Home. This is NOT the final Daily Loop screen (that arrives in M7) —
 * it exists to prove the app boots on iOS/Android/web and that the shared safety-rules
 * package runs on-device (instant emergency banner), matching the architecture in
 * docs/05 and docs/07.
 */
export default function Home() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const apiBaseUrl = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'unset';

  const safety = useMemo(() => (text.trim() ? evaluate(text) : null), [text]);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={[styles.kicker, { color: theme.brand }]}>Healthy Companion</Text>
      <Text style={[styles.title, { color: theme.text }]}>The operating system for your health life</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        M0 scaffold is running. This screen is a placeholder that verifies the app boots and
        that the deterministic safety gate runs on-device.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>Try the on-device safety gate</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Describe how you're feeling…"
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

      <Text style={[styles.footer, { color: theme.textMuted }]}>API base: {apiBaseUrl}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, minHeight: '100%' },
  kicker: { fontSize: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  body: { fontSize: 15, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginTop: spacing.md },
  cardLabel: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 64, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, fontSize: 16 },
  emergency: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  emergencyTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  emergencyBody: { color: '#fff', fontSize: 14, lineHeight: 20 },
  emergencyBtn: { backgroundColor: '#fff', borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  emergencyBtnText: { color: '#C1121F', fontWeight: '800' },
  ok: { fontSize: 14, fontWeight: '600' },
  footer: { fontSize: 12, marginTop: spacing.lg },
});
