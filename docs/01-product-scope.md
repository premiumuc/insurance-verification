# 01 — Product Scope & Key Decisions

**Modes:** 8 (Technical Lead), 2 (MVP Builder)

## 1.1 What this product actually is

The concept document ("Healthy Companion, v1.0") describes an **intelligent health
operating system** — a single companion that connects every dimension of a person's
health life. It is explicitly *not* a tracker, telemedicine app, or symptom checker
alone; it is the connective layer over all of them.

Two structural truths from the doc shape the whole build:

1. **Two-sided marketplace + advertising.** A free **User App** builds the audience; a
   paid **Provider Layer** monetizes access to it; contextual, non-personalized ads are
   a third layer.
2. **Generational delivery.** Features have a "home" in Gen 1 / Gen 2 / Gen 3 so we
   build focus without losing the vision.

## 1.2 Scope decision for this plan — build Generation 1

You answered "two-sided" for users. The concept doc, however, is explicit that the
**Provider Layer is Generation 2**, "developed in a subsequent phase — shaped by what
the user app reveals about what providers need." We reconcile these:

- **We build the Generation 1 User App now.** It is the thing that must exist first;
  nothing about the provider side is knowable until it does.
- **We build the backend two-sided-*ready* from day one** — role-based identity
  (`user` vs `provider`), tenant/organization primitives, and BAA-gated data-sharing
  scaffolding — so Gen 2 slots in without a rewrite. This is the "minimal version that
  is genuinely scalable — no throwaway code" standard.

### In scope (Generation 1)

| Area | Included |
|------|----------|
| Interface | Conversational front door + structured dashboard (hybrid) |
| Tracking | Symptoms, mood/energy, meds + supplements w/ reminders, food/water, sleep, weight/body metrics, menstrual/reproductive, chronic-condition monitoring, sobriety/recovery |
| Devices | Apple Health, Android **Health Connect**, CGMs (Dexcom/Libre), trackers (Fitbit/Garmin/Oura/Whoop) via an aggregator |
| Guidance | Non-clinical nudges, pattern observations, gentle + **emergency escalation** |
| Self-diagnosis | Context-aware symptom assessment via vetted medical API; produces a provider-shareable record |
| Providers | In/out-of-network discovery, appointment reminders & follow-through |
| Goals | Caloric tracking, weight-loss tools, insulin/chronic-condition reminders |
| Compliance | HIPAA-compliant data architecture, audit logging, consent management |

### Explicitly deferred (designed-for, not built)

- **Gen 2:** Provider-facing tools, wellness/grocery partner integrations, ad layer,
  family (pediatric/elder) features, environmental data feeds.
- **Gen 3:** **Insurance & administrative layer** (card storage, EOB interpretation,
  bill/dispute, FSA/HSA, prior-auth) — *this is the only place the repo's namesake
  feature lives* — employer programs, deeper condition management, travel health.

## 1.3 Platforms

- **iOS** (App Store) and **Android** (Google Play) from one Expo/React Native
  codebase, plus a **web** build (the doc calls the User App "mobile and web").
- Native health integrations (HealthKit / Health Connect) require **EAS dev/prod
  builds**, not Expo Go.

## 1.4 Key technical decisions & trade-offs (ADR summary)

Full reasoning in [`02-architecture.md`](./02-architecture.md). Headlines:

| Decision | Choice | Why (trade-off) |
|----------|--------|-----------------|
| Client framework | **Expo React Native + TS** | One codebase → both stores + web; large ecosystem; OTA updates. Vs. native (2× work) / Flutter (weaker JS/health-lib ecosystem). |
| Backend | **Node + Fastify + Prisma (TS monorepo)** | Shared types with the app; fast; boring-reliable. NestJS optional if we want opinionated structure. |
| Database | **PostgreSQL + TimescaleDB** | Relational core + first-class timeseries for device metrics without a second datastore. |
| Cloud | **AWS under a signed BAA** | Broadest HIPAA-eligible service coverage incl. Bedrock. Vs. Supabase (faster MVP; documented as alt, also BAA-capable). |
| Auth | **Amazon Cognito** | HIPAA-eligible, MFA, role claims, ties into AWS. Vs. Auth0/Clerk (BAA only on higher tiers). |
| Conversational AI | **Claude via Amazon Bedrock** | Latest Claude models under AWS's BAA → PHI-safe. Vs. direct API (separate BAA + data-handling review). |
| Medical reasoning | **Third-party vetted engine (e.g. Infermedica)** | The doc mandates a "vetted, medically-trained" layer; don't home-grow clinical logic. Claude orchestrates, it assesses. |
| Wearables | **Aggregator (e.g. Terra/Rook) + native HealthKit/Health Connect** | Avoid N bespoke device integrations for Gen 1. |
| Emergency detection | **Deterministic rules *before* the LLM** | Safety cannot depend on a probabilistic model. |

## 1.5 Open questions for you (non-blocking; sensible defaults chosen)

1. **Repo name** — keep `insurance-verification`, or rename to `healthy-companion`?
   (Recommend rename; docs assume the product name regardless.)
2. **Medical AI vendor** — Infermedica is the working assumption. If you have a
   preferred vetted vendor (Ada, Isabel, Google Health, a payer partner), name it and
   the integration layer adapts. BAA availability is the gating criterion.
3. **Cloud/BAA** — AWS is assumed. If your org already has a HIPAA BAA with GCP/Azure
   or Supabase, we pivot infra with no app-code change.
4. **Web at launch?** — Ship web in Gen 1, or mobile-only first and web fast-follow?
   (Recommend mobile-first, web fast-follow — same codebase.)
5. **Company/legal** — Do you have (or need) counsel for the HIPAA BAAs, medical
   disclaimers, and App Store medical-app review? This is a launch dependency, not a
   code one.
