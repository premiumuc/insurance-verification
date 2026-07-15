import { Redirect } from 'expo-router';
import { FullScreenLoader } from '@/components/ui';
import { useAuth } from '@/providers/auth';

/**
 * Entry redirector. Routes the user based on auth + onboarding state (docs/05 §5.3):
 *   loading    → spinner
 *   signedOut  → /sign-in
 *   onboarding → /profile (first onboarding step)
 *   ready      → /home
 */
export default function Index() {
  const { status } = useAuth();

  switch (status) {
    case 'loading':
      return <FullScreenLoader />;
    case 'signedOut':
      return <Redirect href="/sign-in" />;
    case 'onboarding':
      return <Redirect href="/profile" />;
    case 'ready':
      return <Redirect href="/home" />;
  }
}
