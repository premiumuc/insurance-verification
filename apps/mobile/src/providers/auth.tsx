import type { MeResponse } from '@healthy-companion/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { clearToken, getToken, saveToken } from '@/lib/secure-store';

/**
 * Auth state machine driving the whole app's routing (docs/05 §5.3):
 *   loading    → restoring token / fetching /me
 *   signedOut  → no valid session
 *   onboarding → signed in, onboardingComplete=false
 *   ready      → signed in and onboarded
 */
export type AuthStatus = 'loading' | 'signedOut' | 'onboarding' | 'ready';

interface AuthContextValue {
  status: AuthStatus;
  me: MeResponse | null;
  /** Dev/local: register (or reuse) an account and start a session. */
  signUp: (email: string, firstName?: string) => Promise<void>;
  /** Dev/local: start a session for an existing account. */
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch /me (e.g. after finishing an onboarding step). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function statusFor(me: MeResponse | null): AuthStatus {
  if (!me) return 'signedOut';
  return me.onboardingComplete ? 'ready' : 'onboarding';
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);

  const loadMe = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setMe(null);
      setStatus('signedOut');
      return;
    }
    try {
      const fresh = await api.me();
      setMe(fresh);
      setStatus(statusFor(fresh));
    } catch {
      await clearToken();
      setMe(null);
      setStatus('signedOut');
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const signUp = useCallback(async (email: string, firstName?: string) => {
    const { session } = await api.register({ email, firstName });
    if (session) await saveToken(session.accessToken);
    await loadMe();
  }, [loadMe]);

  const signIn = useCallback(async (email: string) => {
    const session = await api.session(email);
    await saveToken(session.accessToken);
    await loadMe();
  }, [loadMe]);

  const signOut = useCallback(async () => {
    await clearToken();
    setMe(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, me, signUp, signIn, signOut, refresh: loadMe }),
    [status, me, signUp, signIn, signOut, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
