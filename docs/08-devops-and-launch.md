# 08 — DevOps & Launch

**Mode:** 10 (DevOps Engineer)

## 8.1 Environments

- **Accounts/VPCs:** separate `dev`, `staging`, `prod` (ideally separate AWS accounts).
- **Prod PHI never leaves prod.** Lower environments use synthetic data only.
- All infra as code — **Terraform** (or AWS CDK) in `/infra`, reviewed via PR.

## 8.2 Backend infrastructure (AWS, HIPAA-eligible services only)

```
Route53 → CloudFront + AWS WAF → ALB (TLS) → ECS Fargate (Fastify, ≥2 AZ, autoscale)
                                              ├─ RDS PostgreSQL (Multi-AZ, KMS, PITR)
                                              ├─ ElastiCache Redis (queues/cache)
                                              ├─ S3 (KMS, Object Lock for audit mirror)
                                              ├─ Secrets Manager / SSM
                                              ├─ Cognito (identity)
                                              └─ Bedrock (Claude) — in-VPC endpoint
```
- Private subnets for data tier; API in private subnets behind the ALB; no public DB.
- Least-privilege IAM task roles; VPC endpoints for AWS services (no public egress for
  PHI paths).

## 8.3 CI/CD (GitHub Actions)

**On every PR**
- Install (pnpm) → Turborepo affected build
- Typecheck, ESLint, Prettier check
- Unit + integration tests (incl. **Safety-Gate red-flag tests** and **cross-user authZ
  tests** — these gate merge)
- `gitleaks` secret scan, `npm audit`/Dependabot review, SBOM
- Preview: EAS Update to a dev channel for the app; ephemeral API deploy optional

**On merge to `main`**
- Build & push API Docker image → ECS rolling deploy to `staging` → smoke tests → manual
  approval → `prod` (blue/green).
- Prisma migrations run as a gated, backward-compatible step (expand/contract pattern).

**Mobile release**
- **EAS Build** (iOS + Android prod profiles) → **EAS Submit** to App Store Connect &
  Google Play.
- **EAS Update** for OTA JS/asset fixes between store releases (native changes still go
  through the stores).
- Release channels: `preview` (internal), `production`.

## 8.4 Observability & monitoring

- **Logs:** structured JSON, **PHI-redacted**, to CloudWatch; retained per policy.
- **Metrics/traces:** OpenTelemetry → CloudWatch/X-Ray; RED metrics per endpoint; queue
  depth; AI latency/cost dashboards.
- **Errors:** Sentry (BAA + PHI scrubbing) for API and app.
- **Alerts:** p95 latency, 5xx rate, DB connections/replica lag, queue backlog, Bedrock
  throttling, **audit-log anomaly** (unusual cross-user access), cost anomalies.
- **Uptime/synthetics:** health-check + critical-path canaries (login, log a symptom,
  emergency-gate returns correctly).

## 8.5 Reliability targets (starting points)

- API availability ≥ 99.9%; emergency-gate path is the highest-priority SLO.
- **RPO ≤ 5 min** (PITR), **RTO ≤ 1 hr**; monthly tested restores.
- Graceful degradation: if the medical engine or Bedrock is down, chat still logs
  events and the Safety Gate still fires; assessment features show a clear fallback.

## 8.6 Store submission checklist (Generation 1)

**Apple App Store**
- [ ] App Store Connect app + bundle ID, HealthKit entitlement
- [ ] Privacy Nutrition Labels; HealthKit/health data usage strings
- [ ] Medical disclaimers on self-diagnosis surfaces (Guideline 1.4.1 / 5.1.1)
- [ ] Account deletion in-app (required); demo account for review
- [ ] No HealthKit data used for ads (compliant by design)

**Google Play**
- [ ] Play Console app, Health Connect declarations
- [ ] Data Safety form; sensitive-permission justifications; Health apps policy
- [ ] Account deletion + data-deletion URL
- [ ] Target API level compliance

**Both**
- [ ] Privacy Policy + Terms + HIPAA Notice of Privacy Practices URLs
- [ ] Age rating / medical category; support contact
- [ ] Crash-free rate + performance pass on low-end devices

## 8.7 Pre-launch compliance gate (non-code, tracked)

- [ ] AWS BAA executed; Bedrock in-boundary confirmed
- [ ] Medical-engine + aggregator + Sentry BAAs executed
- [ ] Security Risk Assessment (HIPAA §164.308) completed with counsel
- [ ] Penetration test of the API + mobile app
- [ ] Incident-response + breach-notification runbook signed off
