import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GoalType } from '@healthy-companion/types';
import { Body, Button, Field, FullScreenLoader, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

const TYPES: GoalType[] = ['hydration', 'sleep', 'fitness', 'weight', 'nutrition', 'sobriety'];

/** Wellness goals with simple progress tracking (docs/03 §3.8). */
export default function Goals() {
  const theme = useTheme();
  const qc = useQueryClient();
  const goals = useQuery({ queryKey: ['goals'], queryFn: () => api.listGoals() });

  const [type, setType] = useState<GoalType>('hydration');
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api.createGoal({ type, title: title.trim(), target: Number(target), unit: unit.trim() }),
    onSuccess: () => {
      setTitle('');
      setTarget('');
      setUnit('');
      void qc.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const bump = useMutation({
    mutationFn: ({ id, current }: { id: string; current: number }) =>
      api.updateGoal(id, { current }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  if (goals.isLoading) return <FullScreenLoader />;

  return (
    <Screen>
      <Title>Your goals</Title>
      <Body>Small, steady progress. Update as you go — we'll celebrate when you hit them.</Body>

      {goals.data?.items.map((g) => {
        const pct = g.target > 0 ? Math.min(1, g.current / g.target) : 0;
        return (
          <View key={g.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {g.title} {g.status === 'achieved' ? '🎉' : ''}
            </Text>
            <Text style={[styles.cardSub, { color: theme.textMuted }]}>
              {g.current} / {g.target} {g.unit}
            </Text>
            <View style={[styles.track, { backgroundColor: theme.border }]}>
              <View style={[styles.fill, { backgroundColor: theme.brand, width: `${pct * 100}%` }]} />
            </View>
            {g.status !== 'achieved' && (
              <Button
                title="+1 progress"
                variant="secondary"
                onPress={() => bump.mutate({ id: g.id, current: g.current + 1 })}
              />
            )}
          </View>
        );
      })}
      {goals.data && goals.data.items.length === 0 && <Body>No goals yet. Add your first below.</Body>}

      <Text style={[styles.section, { color: theme.text }]}>New goal</Text>
      <View style={styles.chips}>
        {TYPES.map((t) => (
          <Button key={t} title={t} variant={t === type ? 'primary' : 'secondary'} onPress={() => setType(t)} />
        ))}
      </View>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Drink 2L of water" />
      <Field label="Target" value={target} onChangeText={setTarget} placeholder="2000" keyboardType="numeric" />
      <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="ml" autoCapitalize="none" />
      <Button
        title="Add goal"
        onPress={() => create.mutate()}
        loading={create.isPending}
        disabled={!title.trim() || !target || !unit.trim()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 13 },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radius.pill },
  section: { fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
