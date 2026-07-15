import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Body, Button, Field, FullScreenLoader, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/** Care hub — today's medication reminders, medications, and appointments (docs/04). */
export default function Care() {
  const theme = useTheme();
  const qc = useQueryClient();
  const reminders = useQuery({ queryKey: ['reminders'], queryFn: () => api.todayReminders() });
  const meds = useQuery({ queryKey: ['medications'], queryFn: () => api.listMedications() });
  const appts = useQuery({ queryKey: ['appointments'], queryFn: () => api.listAppointments() });

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'taken' | 'skipped' }) =>
      api.respondReminder(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('08:00');
  const addMed = useMutation({
    mutationFn: () =>
      api.createMedication({ name: medName.trim(), isSupplement: false, schedule: { times: [medTime], frequency: 'daily' } }),
    onSuccess: () => {
      setMedName('');
      void qc.invalidateQueries({ queryKey: ['medications'] });
      void qc.invalidateQueries({ queryKey: ['reminders'] });
    },
  });

  if (reminders.isLoading) return <FullScreenLoader />;

  return (
    <Screen>
      <Title>Care</Title>

      <Text style={[styles.section, { color: theme.text }]}>Today's reminders</Text>
      {reminders.data && reminders.data.length > 0 ? (
        reminders.data.map((r) => (
          <View key={r.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{r.medicationName}</Text>
              <Text style={[styles.cardSub, { color: theme.textMuted }]}>
                {new Date(r.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {r.status}
              </Text>
            </View>
            {r.status === 'pending' && (
              <View style={styles.actions}>
                <Pill label="Taken" onPress={() => respond.mutate({ id: r.id, status: 'taken' })} color={theme.success} />
                <Pill label="Skip" onPress={() => respond.mutate({ id: r.id, status: 'skipped' })} color={theme.textMuted} />
              </View>
            )}
          </View>
        ))
      ) : (
        <Body>No reminders today. Add a medication below to get started.</Body>
      )}

      <Text style={[styles.section, { color: theme.text }]}>Add a medication</Text>
      <Field label="Name" value={medName} onChangeText={setMedName} placeholder="e.g. Metformin" />
      <Field label="Time (HH:MM)" value={medTime} onChangeText={setMedTime} placeholder="08:00" autoCapitalize="none" />
      <Button
        title="Add medication"
        onPress={() => medName.trim() && addMed.mutate()}
        loading={addMed.isPending}
        disabled={!medName.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(medTime)}
      />

      <Text style={[styles.section, { color: theme.text }]}>Medications</Text>
      {meds.data && meds.data.length > 0 ? (
        meds.data.map((m) => (
          <View key={m.id} style={[styles.row, { borderColor: theme.border }]}>
            <Text style={[styles.rowMain, { color: theme.text }]}>{m.name}</Text>
            <Text style={[styles.cardSub, { color: theme.textMuted }]}>{m.schedule.times.join(', ')}</Text>
          </View>
        ))
      ) : (
        <Body>No medications yet.</Body>
      )}

      <Text style={[styles.section, { color: theme.text }]}>Appointments</Text>
      {appts.data && appts.data.length > 0 ? (
        appts.data.map((a) => (
          <View key={a.id} style={[styles.row, { borderColor: theme.border }]}>
            <Text style={[styles.rowMain, { color: theme.text }]}>{a.title}</Text>
            <Text style={[styles.cardSub, { color: theme.textMuted }]}>
              {new Date(a.startsAt).toLocaleString()}
            </Text>
          </View>
        ))
      ) : (
        <Body>No upcoming appointments.</Body>
      )}
    </Screen>
  );
}

function Pill({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.pill, { borderColor: color }]}>
      <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '800', marginTop: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  pill: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: spacing.sm },
  rowMain: { fontSize: 15, fontWeight: '700' },
});
