import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, FullScreenLoader, Screen, Title } from '@/components/ui';
import { useDailySummary, usePatterns } from '@/features/tracking/hooks';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

type Phase = 'morning' | 'day' | 'evening';

function phaseFor(hour: number): Phase {
  if (hour < 11) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

const GREETING: Record<Phase, string> = {
  morning: 'Good morning',
  day: 'Hello',
  evening: 'Good evening',
};

const PROMPT: Record<Phase, string> = {
  morning: "Here's your day ahead. How did you sleep?",
  day: 'A gentle check-in — how are you feeling right now?',
  evening: "Let's wind down. Here's a look back at your day.",
};

/**
 * The Daily Use Loop (docs/04 §4.5, docs/05 §5.3) — a single time-aware surface that
 * shows the morning check-in, daytime nudges, or evening reflection. Data comes from the
 * daily summary, today's reminders, and pattern observations.
 */
export default function Home() {
  const theme = useTheme();
  const { me } = useAuth();
  const phase = phaseFor(new Date().getHours());

  const summary = useDailySummary();
  const patterns = usePatterns();
  const reminders = useQuery({ queryKey: ['reminders'], queryFn: () => api.todayReminders() });

  if (summary.isLoading) return <FullScreenLoader />;

  const s = summary.data;
  const pendingReminders = reminders.data?.filter((r) => r.status === 'pending') ?? [];
  const name = me?.profile.firstName ?? 'there';

  return (
    <Screen>
      <Text style={[styles.kicker, { color: theme.brand }]}>{GREETING[phase]}, {name}</Text>
      <Title>{PROMPT[phase]}</Title>

      {/* Primary action: the conversational front door. */}
      <Button title="Talk to your companion" onPress={() => router.push('/chat')} />

      {/* Morning: the day ahead. Evening: the day in review. */}
      {phase !== 'day' && s && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {phase === 'morning' ? 'Your day' : 'Today in review'}
          </Text>
          <Text style={[styles.cardBody, { color: theme.textMuted }]}>
            {s.waterMl > 0 ? `${Math.round(s.waterMl)}ml water` : 'No water logged yet'}
            {s.sleepMinutes != null ? ` · ${Math.round(s.sleepMinutes / 60)}h sleep` : ''}
            {s.latestMood != null ? ` · mood ${s.latestMood}/10` : ''}
          </Text>
        </View>
      )}

      {pendingReminders.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.warning, borderLeftWidth: 4 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {pendingReminders.length} medication reminder{pendingReminders.length > 1 ? 's' : ''} pending
          </Text>
          <Button title="Review in Care" variant="secondary" onPress={() => router.push('/care')} />
        </View>
      )}

      {patterns.data && patterns.data.patterns.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>A gentle observation</Text>
          <Text style={[styles.cardBody, { color: theme.textMuted }]}>{patterns.data.patterns[0]?.message}</Text>
        </View>
      )}

      <Button title="Quick log" variant="secondary" onPress={() => router.push('/log')} />
      <Button title="Goals" variant="secondary" onPress={() => router.push('/goals')} />
      <Button title="Check symptoms" variant="secondary" onPress={() => router.push('/assessment')} />

      <Body>
        Healthy Companion is general wellness support and does not replace professional
        medical care.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 14, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardBody: { fontSize: 14, lineHeight: 20 },
});
