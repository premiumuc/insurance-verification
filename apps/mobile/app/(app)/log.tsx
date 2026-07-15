import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CreateHealthEvent } from '@healthy-companion/types';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { useLogEvent } from '@/features/tracking/hooks';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/**
 * Quick logging. The conversational front door (M3) is the primary capture path; this
 * screen gives fast structured entry with instant feedback and clear empty/error states.
 */
export default function Log() {
  const theme = useTheme();
  const logEvent = useLogEvent();
  const [symptom, setSymptom] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function submit(input: CreateHealthEvent, label: string) {
    setToast(null);
    logEvent.mutate(input, {
      onSuccess: () => setToast(`Logged ${label} ✓`),
    });
  }

  return (
    <Screen>
      <Title>Quick log</Title>
      <Body>Tap to log in a second. Everything shows up on your dashboard.</Body>

      <Text style={[styles.section, { color: theme.text }]}>Water</Text>
      <View style={styles.rowWrap}>
        {[250, 500, 750].map((ml) => (
          <QuickChip
            key={ml}
            label={`+${ml}ml`}
            onPress={() => submit({ type: 'water', source: 'manual', data: { volumeMl: ml } }, 'water')}
          />
        ))}
      </View>

      <Text style={[styles.section, { color: theme.text }]}>Mood</Text>
      <View style={styles.rowWrap}>
        {[2, 4, 6, 8, 10].map((score) => (
          <QuickChip
            key={score}
            label={String(score)}
            active={mood === score}
            onPress={() => {
              setMood(score);
              submit({ type: 'mood', source: 'manual', data: { score } }, 'mood');
            }}
          />
        ))}
      </View>

      <Text style={[styles.section, { color: theme.text }]}>Symptom</Text>
      <Field label="What's going on?" value={symptom} onChangeText={setSymptom} placeholder="e.g. headache" />
      <Button
        title="Log symptom"
        onPress={() => {
          if (!symptom.trim()) return;
          submit({ type: 'symptom', source: 'manual', data: { label: symptom.trim() } }, 'symptom');
          setSymptom('');
        }}
        loading={logEvent.isPending}
        disabled={!symptom.trim()}
      />

      {toast && <Text style={[styles.toast, { color: theme.success }]}>{toast}</Text>}
      <ErrorText>{logEvent.isError ? 'Could not save. Please try again.' : null}</ErrorText>
    </Screen>
  );
}

function QuickChip({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? theme.brand : theme.border, backgroundColor: active ? theme.brand : 'transparent' },
      ]}
    >
      <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '800', marginTop: spacing.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  toast: { fontSize: 14, fontWeight: '700' },
});
