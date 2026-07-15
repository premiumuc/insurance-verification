# 04 — API Design

**Modes:** 6 (Systems Architect), 7 (UI Systems Engineer — the client contract)

## 4.1 Conventions

- **Base:** `https://api.healthycompanion.app/v1` — REST + JSON, versioned in the path.
- **Auth:** `Authorization: Bearer <Cognito JWT>` on everything except auth bootstrap
  and health checks. Server verifies signature, expiry, and `role`/`sub` claims.
- **AuthZ:** ownership-checked — a `user` may only touch their own resources; `provider`
  access (Gen 2) is gated by an active `consents` share + BAA.
- **Validation:** every body/query validated by the shared Zod schema in
  `packages/types`; invalid → `422` with field errors.
- **Idempotency:** mutating POSTs accept `Idempotency-Key` (device retries are common
  on mobile networks).
- **Pagination:** cursor-based (`?cursor=&limit=`) for all lists.
- **Errors:** uniform envelope
  `{ "error": { "code": "string", "message": "human", "details": {...} } }`.
  Codes: `unauthenticated`, `forbidden`, `not_found`, `validation`, `conflict`,
  `rate_limited`, `emergency_escalation`, `internal`.
- **PHI hygiene:** no PHI in URLs (IDs are opaque uuids), query strings, or logs.

## 4.2 Endpoint map (Generation 1)

### Auth & account
```
POST   /v1/auth/register            # bootstrap app-side user after Cognito sign-up
POST   /v1/auth/session             # exchange/refresh (thin wrapper over Cognito)
GET    /v1/me                       # current user + profile + consents summary
PATCH  /v1/me/profile               # update demographics/medical context
DELETE /v1/me                       # right-to-delete (soft delete + purge job)
```

### Consent (gates everything else)
```
GET    /v1/consents
POST   /v1/consents                 # grant  { scope, version }
DELETE /v1/consents/:scope          # revoke
```

### Conversation (the "front door")
```
POST   /v1/conversations
GET    /v1/conversations
GET    /v1/conversations/:id
POST   /v1/conversations/:id/messages   # <- runs Safety Gate → intent → log/ask/assess
                                        #    supports SSE streaming for the reply
```
`POST …/messages` response includes: the assistant message, any `event_ids` created,
an optional `assessment_id`, and — if triggered — an `emergency` block the client must
render prominently.

### Tracking
```
POST   /v1/events                   # create a health_event (manual/UI logging)
GET    /v1/events?type=&from=&to=   # list for dashboard/history
PATCH  /v1/events/:id
DELETE /v1/events/:id
GET    /v1/summary/daily?date=      # morning/evening loop payload (aggregated)
GET    /v1/patterns?window=         # pattern observations (e.g. "headaches 3 days")
```

### Medications
```
GET/POST        /v1/medications
PATCH/DELETE    /v1/medications/:id
GET             /v1/medications/reminders?status=&date=
POST            /v1/medications/reminders/:id/respond   # {taken|skipped}
```

### Appointments & providers
```
GET/POST        /v1/appointments
PATCH/DELETE    /v1/appointments/:id
GET             /v1/appointments/:id/visit-summary      # provider-prep export
GET             /v1/providers/search?q=&specialty=&geo=&network=&insurance=
GET             /v1/providers/:id
```

### Devices & metrics
```
GET    /v1/devices                          # linked connections
POST   /v1/devices/connect                  # start OAuth (aggregator/vendor)
DELETE /v1/devices/:id
POST   /v1/devices/apple-health/sync        # client-pushed HealthKit batch
POST   /v1/devices/health-connect/sync      # client-pushed Health Connect batch
POST   /v1/webhooks/terra                   # aggregator push (signed)
GET    /v1/metrics?metric=&from=&to=&agg=   # timeseries for charts
```

### Self-diagnosis records & goals
```
GET    /v1/assessments
GET    /v1/assessments/:id
POST   /v1/assessments/:id/share            # produce shareable/exportable record
GET/POST /v1/goals
PATCH  /v1/goals/:id
```

### Health/ops (non-PHI)
```
GET    /v1/health        # liveness/readiness
GET    /v1/version
```

## 4.3 Safety-gate contract (applies to chat + assessment paths)

Every message/assessment request passes through the deterministic Safety Gate first. If
an acute red flag matches:
- Response `code: emergency_escalation`, HTTP `200` with an `emergency` payload
  (`{ severity, message, actions: [call_911, nearest_er, poison_control…] }`).
- **No LLM/medical-engine call is made** for that turn; the event is logged and audited.
The client is contractually required to render this full-screen and non-dismissible
until acknowledged.

## 4.4 Streaming

`POST /v1/conversations/:id/messages` supports `Accept: text/event-stream` to stream
the assistant reply token-by-token (Bedrock streaming) for responsiveness, while
structured side-effects (`event_ids`, `assessment_id`) arrive in a final `data:` frame.

## 4.5 Provider Layer (Generation 2 — reserved namespace, not implemented)

`/v1/provider/*` is reserved: `patients` (consent-scoped), `directory-profile`,
`analytics`, `billing`. Documented so client/server versioning anticipates it; returns
`404` in Gen 1.

## 4.6 Rate limiting & abuse

Redis token-bucket per user + per IP; stricter buckets on AI endpoints (cost + abuse).
Emergency-gate responses are never rate-limited.
