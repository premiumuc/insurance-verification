# @healthy-companion/api

Fastify + TypeScript backend.

## Run locally

```bash
cp .env.example .env
pnpm --filter @healthy-companion/api dev
# → http://localhost:3000/v1/health
```

## Endpoints (M0)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/health` | Liveness/readiness (non-PHI) |
| GET | `/v1/version` | Build version/commit |
| POST | `/v1/safety/check` | Server-authoritative deterministic safety gate |

The full endpoint surface is designed in [`../../docs/04-api-design.md`](../../docs/04-api-design.md).
Auth (Cognito), audit logging, and the domain routes land in M1+.

## Conventions

- Errors use the uniform envelope `{ error: { code, message, details? } }`.
- Logs are **PHI-redacted** (see `src/logger.ts`) — never log request bodies or health
  content.
- Config is validated at boot (`src/config.ts`); the process refuses to start if invalid.
