# 06 — Security & HIPAA

**Mode:** 9 (Security Engineer). Also foundational per the concept doc (§8): "HIPAA
compliance is not a feature — it is foundational infrastructure."

## 6.1 Regulatory framing

The platform stores and transmits **Protected Health Information (PHI)** and is a
**HIPAA Covered Entity / Business Associate** depending on relationships. Compliance is
designed in from commit one, never retrofitted. Legal counsel owns the formal
Security Risk Assessment, policies, and NPP — this doc is the **engineering** posture.

## 6.2 BAAs required (a launch dependency, tracked here)

PHI may only flow to services under a signed Business Associate Agreement:

| Vendor | Role | BAA path |
|--------|------|----------|
| AWS | Hosting (ECS/RDS/S3/KMS/Cognito/CloudWatch/**Bedrock**) | AWS BAA (self-serve via Artifact) |
| Amazon Bedrock (Claude) | Conversational/orchestration AI | Covered by AWS BAA (Bedrock is HIPAA-eligible) |
| Medical engine (Infermedica or chosen vendor) | Symptom assessment | Vendor BAA — **must confirm before launch** |
| Wearable aggregator (Terra/Rook) | Device data | Vendor BAA |
| Sentry | Error monitoring | Sentry BAA (Business plan) + PHI scrubbing |
| Push (APNs/FCM/Expo) | Notifications | **No PHI in notification bodies** (avoids BAA need) |

> Rule: if a vendor won't sign a BAA, PHI does not touch it. Push payloads therefore
> carry only opaque references ("You have a new reminder"), never health content.

## 6.3 Technical safeguards (HIPAA §164.312) — mapping

- **Access control (§164.312(a)):** Cognito identity; least-privilege IAM; ownership
  checks on every resource; role-based access (`user`/`provider`/`admin`); MFA
  available (required for provider/admin).
- **Audit controls (§164.312(b)):** append-only `audit_logs` on every PHI
  read/write/export/share, mirrored to immutable storage (S3 Object Lock). Regular
  review workflow.
- **Integrity (§164.312(c)):** DB constraints; append-only audit; object versioning;
  request signing on webhooks.
- **Transmission security (§164.312(e)):** TLS 1.2+ everywhere; HSTS; cert pinning on
  mobile; no PHI in URLs/query strings/logs.
- **Encryption at rest (addressable → implemented):** RDS+KMS, S3+KMS,
  application-layer envelope encryption for the most sensitive fields (🔐 in the data
  model) so a DB dump alone never exposes them.

## 6.4 Threat model & mitigations (highest-severity first)

| # | Severity | Threat / scenario | Mitigation |
|---|----------|-------------------|------------|
| T1 | **Critical** | Broken object-level authZ — user B reads user A's records by guessing IDs | Opaque uuids + mandatory ownership check in a shared middleware; automated tests assert cross-user 403; audit anomaly alerts |
| T2 | **Critical** | PHI leaks to a non-BAA service (LLM/analytics/logs) | BAA-only egress for PHI; PHI-redaction in logger + Sentry beforeSend; data-minimized AI prompts recorded in `context_snapshot` |
| T3 | **Critical** | Emergency symptom mishandled by probabilistic model | Deterministic Safety Gate runs *before* any LLM; non-bypassable; shared client+server ruleset; tested against red-flag corpus |
| T4 | **High** | Stolen/lost device exposes PHI | Biometric app lock; tokens in Keychain/Keystore only; short-lived JWTs + refresh; remote session revocation; auto-lock on background |
| T5 | **High** | Credential stuffing / account takeover | Cognito adaptive auth, MFA, rate limiting, breached-password checks, email/phone verification |
| T6 | **High** | Injection (SQL / prompt) | Parameterized queries via Prisma; Zod validation; prompts sandbox user text as data, tool-use is server-controlled, model can't trigger side-effects directly |
| T7 | **High** | Wearable OAuth token theft | Tokens field-encrypted (🔐), KMS-wrapped; scoped least-privilege; rotation; webhook signature verification |
| T8 | **Medium** | Advertising leaks health data | Ads are contextual + non-personalized by design (doc §7.3); ad layer (Gen 2) never receives PHI or user-level targeting signals |
| T9 | **Medium** | Insider access to PHI | Least-privilege IAM, no standing prod DB access, break-glass with audit, separate environments |
| T10 | **Medium** | Supply-chain (dependency) compromise | Lockfiles, `npm audit`/Dependabot, pinned actions, SBOM, review of new deps |

## 6.5 App Store / Play compliance (medical-app specifics)

- **Not-a-diagnosis** disclaimers on every self-diagnosis surface; clear "suggestions
  and possibilities, never a diagnosis" language (matches doc §4.3).
- **Apple:** HealthKit usage strings + Health data privacy; App Review Guideline 1.4.1
  (physical-harm/medical) and 5.1.1 (health data handling); Privacy Nutrition Labels;
  no using HealthKit data for advertising (Apple policy — aligns with our design).
- **Google Play:** Health Connect data-use declarations, Health apps policy, Data
  Safety form; sensitive-permissions justification.

## 6.6 Secrets & environments

- Secrets in AWS Secrets Manager / SSM; never in the repo or the client bundle.
- Separate `dev` / `staging` / `prod` accounts or VPCs; prod PHI never copied to lower
  envs (use synthetic data).
- Pre-commit + CI secret scanning (gitleaks); GitHub secret scanning enabled.

## 6.7 Incident response & continuity

- Runbook + on-call; breach-notification procedure (HIPAA Breach Notification Rule);
  encrypted backups with tested restores; RTO/RPO defined in
  [`08-devops-and-launch.md`](./08-devops-and-launch.md).
