import { Link } from 'expo-router';
import { useState } from 'react';
import { Body, Button, ErrorText, Field, Screen, Title } from '@/components/ui';
import { useAuth } from '@/providers/auth';

/**
 * Dev/local sign-in (email only). In production this screen delegates to Cognito
 * (hosted UI / Amplify) — the email-only flow is a dev shim so the stack is runnable
 * end-to-end without AWS (see docs/01, apps/api/src/auth).
 */
export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim());
    } catch {
      setError('No account found for that email. Try creating one.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Welcome back</Title>
      <Body>Sign in to your Healthy Companion.</Body>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Sign in" onPress={onSubmit} loading={busy} disabled={!email.includes('@')} />
      <Link href="/sign-up" style={{ marginTop: 8 }}>
        <Body>New here? Create an account</Body>
      </Link>
    </Screen>
  );
}
