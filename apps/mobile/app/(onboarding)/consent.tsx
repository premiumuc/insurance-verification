import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Body, Button, ErrorText, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

const CONSENT_VERSION = '1.0';

interface ConsentItem {
  scope: string;
  title: string;
  description: string;
  required: boolean;
}

// Mirrors REQUIRED_ONBOARDING_SCOPES + optional processing consents (docs/03 §3.8).
const CONSENTS: ConsentItem[] = [
  {
    scope: 'hipaa_notice',
    title: 'HIPAA Notice of Privacy Practices',
    description: 'I acknowledge how my health information is used and protected.',
    required: true,
  },
  {
    scope: 'terms_of_service',
    title: 'Terms of Service',
    description: 'I agree to the terms of using Healthy Companion.',
    required: true,
  },
  {
    scope: 'ai_processing',
    title: 'AI-assisted guidance',
    description: 'Allow my data to power personalized, non-clinical guidance. Optional.',
    required: false,
  },
];

/** Onboarding step 2 — consent capture. Required scopes must be granted to finish. */
export default function OnboardingConsent() {
  const { refresh } = useAuth();
  const theme = useTheme();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRequiredChecked = CONSENTS.filter((c) => c.required).every((c) => checked[c.scope]);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      const toGrant = CONSENTS.filter((c) => checked[c.scope]);
      for (const c of toGrant) {
        await api.grantConsent({ scope: c.scope, version: CONSENT_VERSION });
      }
      await refresh(); // onboardingComplete flips → index redirects to /home
    } catch {
      setError('Could not save your choices. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Your privacy, your choice</Title>
      <Body>HIPAA-grade protection is built in. Please review and agree to continue.</Body>

      {CONSENTS.map((c) => (
        <View
          key={c.scope}
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {c.title}
              {c.required ? ' *' : ''}
            </Text>
            <Switch
              value={Boolean(checked[c.scope])}
              onValueChange={(v) => setChecked((prev) => ({ ...prev, [c.scope]: v }))}
              accessibilityLabel={c.title}
            />
          </View>
          <Text style={[styles.cardBody, { color: theme.textMuted }]}>{c.description}</Text>
        </View>
      ))}

      <ErrorText>{error}</ErrorText>
      <Button title="Finish setup" onPress={onSubmit} loading={busy} disabled={!allRequiredChecked} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1, paddingRight: spacing.sm },
  cardBody: { fontSize: 14, lineHeight: 20 },
});
