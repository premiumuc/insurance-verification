# Security

Healthy Companion handles Protected Health Information (PHI). Security is foundational
(see [`docs/06-security-hipaa.md`](./docs/06-security-hipaa.md)).

## Engineering guarantees in this codebase
- **Authentication** behind a `TokenVerifier` interface — Cognito (RS256/JWKS) in
  production; `AUTH_MODE=local` is refused when `NODE_ENV=production`.
- **Authorization** — ownership is enforced on every resource; cross-user access is
  covered by tests that gate merges.
- **Audit logging** — every PHI read/write appends to an append-only audit log
  (HIPAA §164.312(b)).
- **PHI-safe logging** — the logger redacts sensitive fields; request bodies and health
  content are never logged.
- **Deterministic safety gate** — emergency detection runs before any LLM and cannot be
  suppressed by a model.
- **BAA-only egress** — PHI only flows to services under a signed BAA; push
  notifications never contain health content.

## Reporting a vulnerability
Email **security@healthycompanion.app** with details and reproduction steps. Please do
not open public issues for security reports. We aim to acknowledge within 3 business
days.

## Secrets
No secrets are committed. Configuration is validated at boot; production secrets live in
AWS Secrets Manager. CI runs secret scanning (gitleaks) on every push.
