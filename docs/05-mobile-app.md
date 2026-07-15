# 05 — Mobile App Architecture

**Modes:** 7 (UI Systems Engineer), 2 (MVP Builder)

## 5.1 Framework & libraries

- **Expo (React Native) + TypeScript**, managed workflow with config plugins.
- **Expo Router** — file-based, typed navigation; shared routes across iOS/Android/web.
- **TanStack Query** — server state, caching, offline retry, optimistic updates.
- **Zustand** — light local/UI state (composer draft, app-lock status).
- **React Hook Form + Zod** (schemas shared from `packages/types`).
- **Design system** — universal primitives in `packages/ui`. Recommended: **Tamagui**
  (native + web from one styling system, themeable, performant). Simpler fallback:
  gluestack-ui or RN primitives + a small token layer. Decision flagged, not locked.
- **Health bridges** — `react-native-health` (HealthKit), `react-native-health-connect`
  (Android Health Connect). Require an EAS dev build.
- **Storage/security** — `expo-secure-store` (tokens), `expo-local-authentication`
  (biometric app lock), `expo-notifications` (push).
- **Charts** — `victory-native` / `react-native-skia` for metric visualizations.
- **Observability** — Sentry (BAA), with PHI scrubbing in the beforeSend hook.

## 5.2 Folder structure (`apps/mobile`)

```
apps/mobile/
├─ app/                        # Expo Router routes (file = screen)
│  ├─ (auth)/                  # unauthenticated stack
│  │  ├─ sign-in.tsx
│  │  ├─ sign-up.tsx
│  │  └─ verify.tsx
│  ├─ (onboarding)/            # profile, consents, device linking
│  │  ├─ welcome.tsx
│  │  ├─ profile.tsx
│  │  ├─ consent.tsx
│  │  └─ connect-devices.tsx
│  ├─ (app)/                   # authenticated tabs (role-aware)
│  │  ├─ _layout.tsx           # tab bar; renders user vs provider shell by role
│  │  ├─ index.tsx             # Home = Daily Loop (morning/day/evening)
│  │  ├─ chat/                 # Conversational front door
│  │  │  ├─ index.tsx
│  │  │  └─ [id].tsx
│  │  ├─ dashboard/            # Structured backend: history, patterns, metrics
│  │  ├─ meds/                 # medications + reminders
│  │  ├─ appointments/
│  │  ├─ providers/            # discovery/search
│  │  └─ profile/              # settings, devices, consents, data export
│  ├─ emergency.tsx            # full-screen escalation route
│  └─ _layout.tsx              # root: theme, query client, app-lock gate
├─ src/
│  ├─ features/                # feature modules (mirror API domains)
│  │  ├─ chat/  ├─ tracking/  ├─ meds/  ├─ devices/  ├─ providers/
│  │  ├─ appointments/  ├─ assessments/  └─ profile/
│  │     each: components/  hooks/  api.ts  types.ts
│  ├─ components/              # cross-feature composites (Card, EmptyState…)
│  ├─ providers/              # React context (Auth, AppLock, Theme, Query)
│  ├─ lib/                     # apiClient, secureStorage, notifications, health/
│  │  └─ health/               # HealthKit + Health Connect adapters (unified iface)
│  ├─ safety/                  # imports packages/safety-rules for instant UI banner
│  └─ theme/                   # tokens (light/dark), typography, spacing
└─ app.config.ts               # Expo config + native permissions/plugins
```

## 5.3 Navigation model (both roles, one codebase)

- Role comes from the Cognito JWT claim. `(app)/_layout.tsx` renders the **user tab
  shell** (Home · Chat · Dashboard · Meds · Profile) or, in Gen 2, a **provider shell**
  — same router, role-gated. Gen 1 ships the user shell; provider routes 404 server-side
  and are hidden client-side.
- **Home = the Daily Use Loop**: a time-aware surface that shows the morning check-in,
  daytime nudges/logging, or evening reflection depending on the hour and what's logged.
- **Chat and Dashboard are two views of one truth** — the doc's "conversational front
  door + structured dashboard backend." A chat turn that logs a symptom immediately
  appears in the dashboard; the user never chooses "log vs ask."

## 5.4 The hybrid interaction, concretely

1. User types/speaks naturally in **Chat**.
2. Client runs the shared **safety ruleset** locally for an *instant* emergency banner
   (server remains authoritative), then sends the message.
3. Server returns the reply + any `event_ids` + optional `assessment_id`.
4. TanStack Query invalidates `events`/`summary`/`assessments` → **Dashboard**,
   **Home**, and history update without the user doing anything.

## 5.5 Production-grade UI states (required, not optional)

Every screen/feature explicitly handles:
- **Loading** — skeletons (not spinners) for dashboard/history; streaming indicator for
  chat.
- **Empty** — purposeful first-run states ("Log your first symptom", "Connect a device
  to see trends") that teach the loop.
- **Error** — inline, retryable, never a raw stack trace; offline-aware messaging.
- **Offline** — queued writes via TanStack Query mutation persistence; read from cache;
  reconcile on reconnect.
- **Emergency** — dedicated full-screen route, high-contrast, one-tap call 911 / find ER
  / poison control; non-dismissible until acknowledged.
- **Permissions** — graceful HealthKit/Health Connect/notification denials with a clear
  path to re-enable in settings.

## 5.6 Accessibility (WCAG 2.2 AA target)

Full screen-reader labels (VoiceOver/TalkBack), Dynamic Type / font scaling, ≥4.5:1
contrast in light and dark, ≥44pt touch targets, reduced-motion support, and voice
input for the chat front door (health apps are used one-handed and by users with
impairments — this is a core requirement, not polish).

## 5.7 Security on device

- Tokens only in Keychain/Keystore via SecureStore — never AsyncStorage.
- **Biometric app lock** gate (Face ID / fingerprint) before any PHI renders.
- No PHI in logs, analytics, or crash reports (Sentry beforeSend scrubbing).
- Certificate pinning to the API; jailbreak/root awareness (warn/limit).
- Auto-lock on background; clear sensitive state from memory on lock.

## 5.8 Performance (Mode 4 hooks, applied early)

- `FlashList` for long history/metric lists; windowed rendering.
- Memoized selectors; avoid re-rendering the chat transcript on each token (append to a
  virtualized list).
- Skia/native charts off the JS thread; downsample timeseries server-side (`agg=`).
- Prefetch the Daily Loop payload on app focus; OTA updates via EAS Update for fast
  iteration without store round-trips.
