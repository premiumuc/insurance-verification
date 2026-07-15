# Healthy Companion

> The operating system for your health life. A free, mobile-first health & wellness
> platform that becomes the connective tissue between every dimension of a person's
> health — wearables, medications, symptoms, providers, nutrition, and more.

**Status:** **Generation 1 feature-complete** (milestones M0–M8). The full consumer app
is built, runnable, and green (typecheck · lint · ~80 tests). Remaining work to ship is
operational — real AWS/BAA provisioning, EAS builds, and store submission — tracked in
[`store/LAUNCH.md`](./store/LAUNCH.md).

| Milestone | What shipped |
|-----------|--------------|
| M0 | Turborepo scaffold, tested safety-gate engine, Fastify API, Expo app, infra + CI |
| M1 | Identity/onboarding/consent, Cognito-or-dev auth, audit logging, biometric lock |
| M2 | Health-event tracking + dashboard + non-clinical patterns |
| M3 | Conversational front door, safety-gate-first, Claude-via-Bedrock engine |
| M4 | Medications, reminders, appointments, visit-summary export |
| M5 | Device connections + metric timeseries (HealthKit / Health Connect / aggregator) |
| M6 | Contextualized self-diagnosis + provider discovery |
| M7 | Daily Use Loop, goals, guidance surfacing |
| M8 | EAS build/submit config, store collateral, security + launch runbook |

Every external dependency (Postgres, Cognito, Bedrock/Claude, Infermedica, Terra,
HealthKit/Health Connect) sits behind an adapter interface with a **working local/mock
implementation** (so it runs and tests here) and a **production implementation** as
committed code. See [`docs/09-roadmap-and-plan.md`](./docs/09-roadmap-and-plan.md).

### Quick start

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test   # all green
pnpm --filter @healthy-companion/api dev   # API → http://localhost:3000/v1/health
pnpm --filter @healthy-companion/mobile dev  # Expo (iOS/Android/web)
```

The API runs fully offline in `AUTH_MODE=local` + `CHAT_ENGINE=local` (the defaults) —
no AWS required for local development.

> ⚠️ **Repository naming note.** This repo is named `insurance-verification`, but the
> product defined in the concept document is **Healthy Companion**, a broad health
> platform. "Insurance verification" is a single ecosystem feature scheduled for
> **Generation 3**, not the core product. Consider renaming the repo (e.g.
> `healthy-companion`) before the codebase grows. See
> [`docs/01-product-scope.md`](./docs/01-product-scope.md).

---

## What we're building (first)

We build the product in **generations** (the concept doc's phasing). This plan scopes
and designs **Generation 1 — the Core Platform**: the free consumer app that earns
daily use and builds the user base.

- Conversational front door + structured dashboard (hybrid interface)
- Core health tracking (symptoms, meds, sleep, mood, nutrition, hydration, weight)
- Wearable/device integration (Apple Health, Android Health Connect, CGMs, trackers)
- A **safety-gated** guidance engine + contextualized self-diagnosis
- Provider discovery (in / out of network)
- HIPAA-compliant data architecture **from day one**

Generation 2 (provider-facing tools, ecosystem partners, ads) and Generation 3
(insurance/admin, employer programs) are designed-for but not built yet — the backend
is built two-sided-ready so they slot in without a rewrite.

## The plan (read in order)

| # | Doc | What's in it |
|---|-----|--------------|
| 01 | [Product scope & decisions](./docs/01-product-scope.md) | Restatement, Gen-1 cut line, open questions, key trade-offs |
| 02 | [System architecture](./docs/02-architecture.md) | Components, data flow, tech stack, monorepo layout, ADRs |
| 03 | [Data model](./docs/03-data-model.md) | Postgres schema, PHI classification, timeseries, audit |
| 04 | [API design](./docs/04-api-design.md) | Endpoints, auth, versioning, error model |
| 05 | [Mobile app architecture](./docs/05-mobile-app.md) | Expo/RN folder structure, navigation, UI system, both roles |
| 06 | [Security & HIPAA](./docs/06-security-hipaa.md) | Threat model, compliance controls, BAAs, mobile hardening |
| 07 | [AI & device integrations](./docs/07-ai-and-integrations.md) | Conversational + medical AI, safety gating, wearables |
| 08 | [DevOps & launch](./docs/08-devops-and-launch.md) | CI/CD, infra, monitoring, App Store / Play submission |
| 09 | [Roadmap & implementation plan](./docs/09-roadmap-and-plan.md) | Generation mapping, milestones, build sequence |

## Tech stack (at a glance)

- **Mobile/web app:** Expo (React Native) + TypeScript, Expo Router, TanStack Query
- **Backend:** Node.js + Fastify (NestJS optional) + Prisma, TypeScript
- **Database:** PostgreSQL (+ TimescaleDB for metrics), Redis (cache/queues)
- **Auth:** Amazon Cognito (HIPAA-eligible), MFA, role-based (user / provider)
- **AI:** Claude via **Amazon Bedrock** (HIPAA-eligible) for conversation/orchestration;
  a vetted third-party medical engine (e.g. Infermedica) for clinical symptom assessment
- **Cloud:** AWS under a signed BAA; ECS Fargate, RDS, KMS, CloudWatch
- **Delivery:** Turborepo monorepo, EAS Build/Submit/Update, GitHub Actions

See [`docs/02-architecture.md`](./docs/02-architecture.md) for the reasoning behind each.

## Non-negotiables

1. **HIPAA is infrastructure, not a feature.** Encryption, audit logging, access
   control, and BAAs are designed in from commit one.
2. **Safety-first AI.** Deterministic red-flag/emergency detection runs *before* any
   LLM. The app suggests possibilities, never diagnoses.
3. **No throwaway code.** The minimal build is the scalable build.
