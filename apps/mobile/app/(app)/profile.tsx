import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Screen, Title } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/** Account + privacy overview and sign-out. Full settings expand in later milestones. */
export default function Profile() {
  const theme = useTheme();
  const { me, signOut } = useAuth();

  return (
    <Screen>
      <Title>Profile</Title>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Row label="Name" value={[me?.profile.firstName, me?.profile.lastName].filter(Boolean).join(' ') || '—'} />
        <Row label="Email" value={me?.email ?? '—'} />
        <Row label="Date of birth" value={me?.profile.dateOfBirth ?? '—'} />
        <Row label="Onboarding" value={me?.onboardingComplete ? 'Complete' : 'Incomplete'} />
      </View>

      <Text style={[styles.section, { color: theme.text }]}>Your consents</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {me && me.consents.length > 0 ? (
          me.consents.map((c) => (
            <Row key={c.scope} label={c.scope} value={c.granted ? 'Granted' : 'Revoked'} />
          ))
        ) : (
          <Body>No consents recorded.</Body>
        )}
      </View>

      <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowLabel: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  rowValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  section: { fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
});
