import { Link } from 'expo-router';
import { useState } from 'react';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { useAuth } from '@/providers/auth';

/** Dev/local sign-up. Production delegates account creation to Cognito. */
export default function SignUp() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signUp(email.trim(), firstName.trim() || undefined);
    } catch {
      setError('Could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Create your account</Title>
      <Body>It's free. Your health data is encrypted and yours.</Body>
      <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="Alex" />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Create account" onPress={onSubmit} loading={busy} disabled={!email.includes('@')} />
      <Link href="/sign-in" style={{ marginTop: 8 }}>
        <Body>Already have an account? Sign in</Body>
      </Link>
    </Screen>
  );
}
