import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CreateAssessmentResponse } from '@healthy-companion/types';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

const TRIAGE_COPY: Record<string, string> = {
  self_care: 'Likely manageable at home — keep an eye on it.',
  consult_soon: 'Consider talking to a provider soon.',
  consult_urgent: 'Please seek care promptly.',
};

/** Contextualized self-diagnosis (docs/07 §7.1). Always "possibilities, not a diagnosis". */
export default function Assessment() {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [result, setResult] = useState<CreateAssessmentResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addSymptom() {
    const s = input.trim();
    if (s && !symptoms.includes(s)) setSymptoms((prev) => [...prev, s]);
    setInput('');
  }

  async function run() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.createAssessment(symptoms);
      if (res.emergency) {
        router.push('/emergency');
        return;
      }
      setResult(res);
    } catch {
      setError('Could not complete the check. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const a = result?.assessment;

  return (
    <Screen>
      <Title>Check your symptoms</Title>
      <View style={[styles.notice, { backgroundColor: theme.surface, borderColor: theme.warning }]}>
        <Text style={[styles.noticeText, { color: theme.text }]}>
          This gives possibilities based on what you share and what we know about you — it is
          not a diagnosis and does not replace a professional.
        </Text>
      </View>

      <Field label="Add a symptom" value={input} onChangeText={setInput} placeholder="e.g. headache" />
      <Button title="Add" variant="secondary" onPress={addSymptom} disabled={!input.trim()} />

      {symptoms.length > 0 && (
        <View style={styles.chips}>
          {symptoms.map((s) => (
            <TouchableOpacity
              key={s}
              accessibilityRole="button"
              onPress={() => setSymptoms((prev) => prev.filter((x) => x !== s))}
              style={[styles.chip, { borderColor: theme.brand }]}
            >
              <Text style={{ color: theme.brand, fontWeight: '700' }}>{s} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Button title="Check symptoms" onPress={run} loading={busy} disabled={symptoms.length === 0} />
      <ErrorText>{error}</ErrorText>

      {a && (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Text style={[styles.section, { color: theme.text }]}>What this could be</Text>
          <Text style={[styles.triage, { color: theme.brand }]}>{TRIAGE_COPY[a.result.triage] ?? ''}</Text>
          {a.result.possibilities.map((p) => (
            <View key={p.name} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{p.commonName ?? p.name}</Text>
              <Text style={[styles.cardSub, { color: theme.textMuted }]}>
                Relative likelihood {Math.round(p.likelihood * 100)}%
              </Text>
            </View>
          ))}
          <Body>{a.result.advice}</Body>
          <Button title="Find care nearby" variant="secondary" onPress={() => router.push('/providers')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.sm, padding: spacing.md },
  noticeText: { fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 2, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  section: { fontSize: 18, fontWeight: '800' },
  triage: { fontSize: 15, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 13 },
});
