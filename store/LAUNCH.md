# Launch Runbook — Healthy Companion (Generation 1)

Operational checklist to take the Gen-1 build from this repo to the App Store and Google
Play. Items marked **(external)** require your real accounts, credentials, or legal
counsel and cannot be completed inside this repo.

## 1. Compliance gate (do first — blocks launch)
- [ ] **(external)** Execute AWS BAA; confirm Bedrock is in-boundary.
- [ ] **(external)** Execute BAAs with the medical engine (Infermedica), wearable
      aggregator (Terra), and Sentry.
- [ ] **(external)** HIPAA Security Risk Assessment (§164.308) completed with counsel.
- [ ] **(external)** Finalize `store/PRIVACY.md`, `store/TERMS.md`, and a HIPAA Notice of
      Privacy Practices; publish at stable URLs.
- [ ] **(external)** Third-party penetration test of API + mobile app.

## 2. Backend go-live
- [ ] Provision infra via `infra/` (Terraform) in the prod AWS account.
- [ ] Set `AUTH_MODE=cognito` and `CHAT_ENGINE=bedrock`; configure secrets in AWS
      Secrets Manager (never in the repo).
- [ ] Run Prisma migrations against RDS; implement the repository interfaces on Postgres
      (swap `createMemoryRepositories`).
- [ ] Wire Sentry (with PHI scrubbing) and CloudWatch alarms (p95 latency, 5xx, DB,
      audit-log anomalies).
- [ ] Smoke test `/v1/health`, auth, a chat turn, and the emergency gate in staging.

## 3. Mobile build & submission
- [ ] **(external)** Create the Expo/EAS project; set `projectId` in `app.config.ts` and
      `eas.json`, and the Apple/Google identifiers.
- [ ] Produce app icons + splash (1024² icon, adaptive Android icon) and store
      screenshots.
- [ ] `eas build --profile production` for iOS + Android.
- [ ] `eas submit --profile production` to App Store Connect and Google Play.

### Apple App Store review specifics
- [ ] Privacy Nutrition Labels completed (health data collected, not used for tracking).
- [ ] HealthKit usage strings present (already in `app.config.ts`).
- [ ] Medical disclaimers visible on self-diagnosis surfaces (Guideline 1.4.1 / 5.1.1).
- [ ] In-app **account deletion** available; provide a review demo account.
- [ ] Confirm HealthKit data is not used for advertising.

### Google Play review specifics
- [ ] Health Connect data-use declaration + Data Safety form.
- [ ] Health apps policy compliance; sensitive-permission justifications.
- [ ] Account + data deletion path documented.

## 4. Post-launch
- [ ] Monitor crash-free rate, RED metrics, AI cost/latency, audit anomalies.
- [ ] EAS Update channel `production` ready for OTA JS fixes (native changes → store).
- [ ] Incident-response + breach-notification runbook on-call.

## Definition of done (Gen 1)
User can: sign up → onboard (profile + consent) with biometric lock → chat naturally
(safety-gated) → track & see a dashboard → get non-diagnostic guidance → manage meds,
reminders & appointments → connect devices → find providers → set goals — all HIPAA-shaped,
on iOS, Android, and web from one codebase.
