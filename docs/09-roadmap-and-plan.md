# 09 — Roadmap & Implementation Plan

**Modes:** 8 (Technical Lead), 2 (MVP Builder)

## 9.1 Generation mapping (from the concept doc)

| Generation | Theme | This plan |
|-----------|-------|-----------|
| **Gen 1 — Core Platform** | Earn daily use, build the user base | **Designed here; built next (pending sign-off)** |
| **Gen 2 — Ecosystem Expansion** | Provider tools, wellness/grocery partners, ads, family, environmental | Backend built *ready*; not implemented |
| **Gen 3 — Platform Depth** | **Insurance/admin (repo namesake)**, employer programs, deeper conditions, travel | Schema stubbed; not implemented |

## 9.2 Generation 1 build sequence (milestones)

> **Build status: M0–M8 complete.** All milestones below are implemented, runnable, and
> green (typecheck · lint · ~80 tests). What remains before store submission is
> operational (real AWS/BAA provisioning, EAS builds, review) — see
> [`../store/LAUNCH.md`](../store/LAUNCH.md).

Each milestone is shippable/verifiable on its own. HIPAA controls (encryption, audit,
authZ, safety gate) are built **into** every milestone, not bolted on at the end.

**M0 — Foundations (repo + infra skeleton)**
- Turborepo scaffold: `apps/mobile`, `apps/api`, `packages/{types,ui,safety-rules}`.
- Terraform baseline: VPC, RDS (empty), Cognito pool, S3, KMS, ECS service, CI/CD.
- Shared config, lint/format/typecheck, CI pipeline green.
- **Exit:** empty app boots on iOS/Android/web; API `/v1/health` deployed to staging.

**M1 — Identity, onboarding, consent**
- Cognito auth flows (sign-up/in, MFA, verify); app-side `users`/`profiles`.
- Onboarding: profile/demographics, HIPAA notice + consent capture, biometric app lock.
- Audit logging + authZ middleware in place from here on.
- **Exit:** a user can register, complete profile, grant consents, and unlock with
  biometrics; every PHI access is audited.

**M2 — Tracking core + dashboard**
- `health_events` + manual logging UI; daily/history/patterns endpoints.
- Dashboard (history at a glance, trends) with full loading/empty/error/offline states.
- **Exit:** user can log symptoms/mood/food/water/sleep/weight and review history.

**M3 — Conversational front door + Safety Gate**
- Chat UI (streaming) → `POST /messages`; **Safety Gate deterministic rules** (client +
  server) with a tested red-flag corpus + emergency screen.
- Claude (Bedrock) intent detection + structured extraction → events appear in
  dashboard. The "log vs ask" decision disappears.
- **Exit:** natural-language logging works; emergencies escalate correctly and
  provably (tests).

**M4 — Medications, reminders, appointments**
- Meds CRUD + schedules; reminder worker + push (no PHI in payloads); adherence.
- Appointments + reminders + "prep for visit" summary export.
- **Exit:** insulin/chronic-condition + med reminders fire; visit summary exports.

**M5 — Devices & metrics**
- HealthKit + Health Connect on-device sync; aggregator (Terra) OAuth + webhooks; CGM
  (Dexcom/Libre) via aggregator.
- `metric_samples` timeseries + charts; metrics feed patterns/guidance.
- **Exit:** wearable/CGM data flows in and drives dashboard trends + nudges.

**M6 — Contextualized self-diagnosis + provider discovery**
- Medical-engine integration behind the `MedicalEngine` interface; `assessments` with
  disclaimers + shareable record.
- Provider search (NPPES + network status), appointment assist.
- **Exit:** context-aware symptom assessment produces a provider-shareable record;
  users can find in/out-of-network providers.

**M7 — Daily Use Loop + guidance polish**
- Time-aware Home (morning check-in / daytime nudges / evening reflection); pattern
  narration; goals (weight/nutrition/fitness/sleep/hydration/sobriety).
- Accessibility + performance pass (Mode 7 + Mode 4).
- **Exit:** the full daily loop feels cohesive; a11y (WCAG 2.2 AA) + perf targets met.

**M8 — Hardening & launch**
- Security review/pen test; BAAs executed; store assets, privacy labels, disclaimers.
- Observability, alerts, runbooks; beta (TestFlight / Play internal) → GA.
- **Exit:** App Store + Google Play submissions pass review; monitored in prod.

## 9.3 Cross-cutting workstreams (parallel to milestones)

- **Compliance & legal** (BAAs, SRA, policies, disclaimers) — owned with counsel;
  gates M8, started at M0.
- **Design system** (`packages/ui`, tokens, a11y patterns) — grows with each milestone.
- **Testing** — unit (safety rules, extractors), integration (authZ, APIs), e2e
  (Detox/Maestro) for critical flows; safety + authZ tests gate every merge.

## 9.4 Sequencing rationale (Technical Lead view)

- **Safety and compliance are load-bearing and go early** (M1 audit/authZ, M3 safety
  gate) — retrofitting either is the classic way these products fail review or leak PHI.
- **Tracking + dashboard (M2) before AI (M3)** so the AI has a real data model to write
  into and the "hybrid interface" has a structured backend to reflect.
- **Devices (M5) before self-diagnosis (M6)** because contextualized assessment is only
  as good as the context (sleep/hydration/metrics) it can read — the doc's whole thesis.
- **Provider layer (Gen 2) intentionally excluded** — the doc says it must be shaped by
  what the user app reveals; building it now would be guessing.

## 9.5 What I need from you to start building (recap of open questions)

1. **Sign-off** on this plan (or edits).
2. **Repo rename?** `insurance-verification` → `healthy-companion` (recommended).
3. **Medical AI vendor** (default Infermedica) and **cloud/BAA** (default AWS)
   confirmations — pivotable, but they affect M5/M6 and infra.
4. **Web at launch** vs mobile-first (recommend mobile-first, web fast-follow).
5. **Legal/BAA ownership** — who executes agreements and owns the SRA.

On sign-off, I'll start at **M0** (Turborepo scaffold + infra skeleton + CI) and build
milestone by milestone on `claude/fullstack-ios-android-app-y8b1aw`.
