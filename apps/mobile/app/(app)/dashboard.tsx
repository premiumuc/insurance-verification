import { StyleSheet, Text, View } from 'react-native';
import { Body, FullScreenLoader, Screen, Title } from '@/components/ui';
import { useDailySummary, usePatterns, useRecentEvents } from '@/features/tracking/hooks';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/** Dashboard — history at a glance + non-clinical pattern observations (docs/03 §3.3). */
export default function Dashboard() {
  const theme = useTheme();
  const summary = useDailySummary();
  const patterns = usePatterns();
  const recent = useRecentEvents();

  if (summary.isLoading) return <FullScreenLoader />;

  const s = summary.data;
  const stats = [
    { label: 'Water', value: s ? `${Math.round(s.waterMl)} ml` : '—' },
    { label: 'Sleep', value: s?.sleepMinutes != null ? `${Math.round(s.sleepMinutes / 60)} h` : '—' },
    { label: 'Mood', value: s?.latestMood != null ? `${s.latestMood}/10` : '—' },
    { label: 'Weight', value: s?.latestWeightKg != null ? `${s.latestWeightKg} kg` : '—' },
  ];

  return (
    <Screen>
      <Title>Your day</Title>
      <Body>A snapshot of what you've logged today.</Body>

      <View style={styles.grid}>
        {stats.map((st) => (
          <View key={st.label} style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>{st.value}</Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>{st.label}</Text>
          </View>
        ))}
      </View>

      {patterns.data && patterns.data.patterns.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[styles.section, { color: theme.text }]}>Observations</Text>
          {patterns.data.patterns.map((p) => (
            <View key={p.id} style={[styles.pattern, { backgroundColor: theme.surface, borderColor: theme.warning }]}>
              <Text style={[styles.patternText, { color: theme.text }]}>{p.message}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.section, { color: theme.text }]}>Recent</Text>
      {recent.data && recent.data.items.length > 0 ? (
        recent.data.items.map((e) => (
          <View key={e.id} style={[styles.row, { borderColor: theme.border }]}>
            <Text style={[styles.rowType, { color: theme.brand }]}>{e.type}</Text>
            <Text style={[styles.rowTime, { color: theme.textMuted }]}>
              {new Date(e.occurredAt).toLocaleString()}
            </Text>
          </View>
        ))
      ) : (
        <Body>Nothing logged yet. Head to the Log tab to start.</Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexGrow: 1, minWidth: '45%', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 13, fontWeight: '600' },
  section: { fontSize: 18, fontWeight: '800', marginTop: spacing.sm },
  pattern: { borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.sm, padding: spacing.md },
  patternText: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: spacing.sm },
  rowType: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  rowTime: { fontSize: 13 },
});
