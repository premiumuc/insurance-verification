import Constants from 'expo-constants';
import type {
  Consent,
  GrantConsent,
  MeResponse,
  Profile,
  RegisterRequest,
  SessionResponse,
  UpdateProfile,
} from '@healthy-companion/types';
import { getToken } from './secure-store';

const BASE_URL = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'http://localhost:3000/v1';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(status: number, body: ApiErrorShape) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach the stored bearer token. Defaults to true. */
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (json as { error?: ApiErrorShape } | null)?.error ?? {
      code: 'internal',
      message: 'Request failed',
    };
    throw new ApiError(res.status, err);
  }
  return json as T;
}

/** Typed API surface used by the app. Mirrors docs/04. */
export const api = {
  register: (input: RegisterRequest) =>
    request<{ me: MeResponse; session: SessionResponse | null }>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    }),

  // Dev/local session. Production obtains tokens from Cognito.
  session: (email: string) =>
    request<SessionResponse>('/auth/session', { method: 'POST', body: { email }, auth: false }),

  me: () => request<MeResponse>('/me'),

  updateProfile: (patch: UpdateProfile) =>
    request<Profile>('/me/profile', { method: 'PATCH', body: patch }),

  listConsents: () => request<Consent[]>('/consents'),

  grantConsent: (input: GrantConsent) =>
    request<Consent>('/consents', { method: 'POST', body: input }),
};
