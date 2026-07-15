import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { UpdateProfile } from '@healthy-companion/types';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { radius, spacing } from '@/theme/tokens';

/**
 * Onboarding step 1 — minimum profile (date of birth + sex at birth). These two fields
 * are the baseline context the self-diagnosis engine needs (docs/03 §3.2) and are what
 * flip `onboardingComplete` alongside the required consents.
 */
type Sex = NonNullable<UpdateProfile['sexAtBirth']>;
const SEX_OPTIONS: Sex[] = ['female', 'male', 'intersex', 'unknown'];

export default function OnboardingProfile() {
  const { refresh } = useAuth();
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dobValid = /^\d{4}-\d{2}-\d{2}$/.test(dob);

  async function onSubmit() {
    if (!dobValid || !sex) {
      setError('Please enter your date of birth (YYYY-MM-DD) and select an option.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.updateProfile({ dateOfBirth: dob, sexAtBirth: sex });
      await refresh();
      router.push('/consent');
    } catch {
      setError('Could not save your profile. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>A little about you</Title>
      <Body>This helps us give you guidance that actually fits. You can edit it anytime.</Body>

      <Field
        label="Date of birth (YYYY-MM-DD)"
        value={dob}
        onChangeText={setDob}
        placeholder="1990-05-01"
        autoCapitalize="none"
      />

      <Body>Sex assigned at birth</Body>
      <SexPicker value={sex} onChange={setSex} />

      <ErrorText>{error}</ErrorText>
      <Button title="Continue" onPress={onSubmit} loading={busy} disabled={!dobValid || !sex} />
    </Screen>
  );
}

function SexPicker({ value, onChange }: { value: Sex | null; onChange: (v: Sex) => void }) {
  const theme = useTheme();
  return (
    <View style={pickerStyles.row}>
      {SEX_OPTIONS.map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt)}
            style={[
              pickerStyles.chip,
              {
                borderColor: selected ? theme.brand : theme.border,
                backgroundColor: selected ? theme.brand : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: selected ? '#fff' : theme.text,
                fontWeight: '600',
                textTransform: 'capitalize',
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
