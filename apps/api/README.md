# @healthy-companion/api

Fastify + TypeScript backend.

## Run locally

```bash
cp .env.example .env
pnpm --filter @healthy-companion/api dev
# → http://localhost:3000/v1/health
```

## Endpoints (M0–M1)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1/health` | — | Liveness/readiness (non-PHI) |
| GET | `/v1/version` | — | Build version/commit |
| POST | `/v1/safety/check` | — | Server-authoritative deterministic safety gate |
| POST | `/v1/auth/register` | token/dev | Provision app-side user after Cognito sign-up |
| POST | `/v1/auth/session` | dev only | Mint a dev token (prod uses Cognito) |
| GET | `/v1/me` | ✓ | Current user + profile + consents + onboarding state |
| PATCH | `/v1/me/profile` | ✓ | Update demographics/medical context |
| GET/POST | `/v1/consents` | ✓ | List / grant consent |
| DELETE | `/v1/consents/:scope` | ✓ | Revoke consent |

Every PHI read/write is written to the append-only audit log. Auth runs in `local`
(dev shim, HS256) or `cognito` (prod, RS256/JWKS) mode — `local` is refused in
production. The full surface is designed in
[`../../docs/04-api-design.md`](../../docs/04-api-design.md); remaining domain routes
land in M2+.

## Data layer

M1 runs on in-memory repositories (`src/db/memory.ts`) so the stack is fully runnable
and testable without a database. `prisma/schema.prisma` is the target Postgres schema;
M2 implements the repository interfaces against RDS.

## Conventions

- Errors use the uniform envelope `{ error: { code, message, details? } }`.
- Logs are **PHI-redacted** (see `src/logger.ts`) — never log request bodies or health
  content.
- Config is validated at boot (`src/config.ts`); the process refuses to start if invalid.
