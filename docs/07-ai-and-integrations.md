# 07 — AI Layer & Device Integrations

**Modes:** 6 (Systems Architect), 9 (Security Engineer — safety)

## 7.1 The two-brain AI design

The concept doc mandates a **"vetted, medically-trained AI layer (integrated via
existing third-party medical intelligence APIs)"** and is emphatic the app gives
"suggestions and possibilities, never a diagnosis." We therefore split AI into two
clearly-bounded roles — we do **not** home-grow clinical inference:

```mermaid
flowchart LR
  U[User message] --> SG{Safety Gate\n(deterministic rules)}
  SG -- red flag --> E[Emergency response\nno model call]
  SG -- clear --> C[Claude via Bedrock\nunderstand · orchestrate · summarize]
  C -- symptom intent + context --> M[Medical engine\nInfermedica: assessment/triage]
  M --> C
  C --> R[Contextual, disclaimered reply]
  C --> L[Structured events persisted]
```

### Brain 1 — Claude (via Amazon Bedrock): the conversationalist/orchestrator
- **Why Claude:** it is the most capable model for the natural-language glue this
  product lives on — understanding messy human input, extracting structured logs,
  contextualizing, and writing warm, careful, disclaimered responses.
- **Why Bedrock:** Amazon Bedrock is **HIPAA-eligible under the AWS BAA**, so Claude
  runs inside our compliance boundary and PHI never leaves it. (Direct Anthropic API is
  possible with its own BAA/zero-retention review, but Bedrock keeps one BAA surface.)
- **Model tiers (default to the latest Claude):** a capable model (e.g. Claude Opus /
  Sonnet 5 class) for reasoning-heavy turns (assessment orchestration, summaries); a
  fast model (Haiku class) for lightweight intent classification and nudges — chosen per
  request to balance latency and cost. Pin exact model IDs at build time and review on
  each release.
- **Responsibilities:** intent detection (`log`/`ask`/`both`), structured extraction
  into `health_events`, orchestration of the medical engine, daily-loop summaries,
  pattern narration ("headaches 3 days — enough water?"). **Not** responsible for
  clinical assessment or emergency detection.
- **Guardrails:** user text is passed as *data*, never as instructions; tool-use is
  server-mediated (the model requests an action, the server authorizes and executes);
  outputs for any health surface carry the non-diagnostic disclaimer; prompts are
  data-minimized and the exact context used is recorded in `assessments.context_snapshot`.

### Brain 2 — Vetted medical engine (Infermedica assumed)
- Performs the actual **symptom → ranked conditions + triage level** assessment using a
  medically-trained, regulated knowledge base, given the user's contextual profile
  (age, sex, history, meds, recent sleep/hydration/stress signals — exactly the inputs
  the doc §4.3 lists).
- Output is explicitly **possibilities + triage**, never a diagnosis; stored as an
  `assessment` the user can bring to a provider.
- **Swappable:** wrapped behind a `MedicalEngine` interface so Ada/Isabel/a payer
  partner can replace it. BAA availability is the selection gate.

### The Safety Gate — deterministic, first, non-bypassable
- A shared, unit-tested ruleset (`packages/safety-rules`) runs **before any model** on
  every symptom/chat turn.
- Detects acute red flags — chest pain, stroke (FAST), anaphylaxis, severe bleeding,
  overdose, suicidal ideation, etc. — and routes immediately to emergency guidance
  (call 911 / nearest ER / 988 / poison control), per doc §4.2 "clear emergency
  escalation … routes immediately to emergency services."
- Runs on the **client** too (instant banner) and the **server** (authoritative). No
  probabilistic component can suppress it.

## 7.2 Guidance engine (non-clinical)

Pattern detection runs as an async worker over `health_events` + `metric_samples`:
hydration/sleep nudges, "3 days of headaches" observations, gentle escalation ("you
might want to talk to someone"). These are **non-clinical** and phrased as
observations/suggestions — Claude narrates, rules decide when to surface.

## 7.3 Device & wearable integration

The doc's advantage is "data users are already generating." Two ingestion paths:

### On-device (phone-native)
- **iOS — Apple HealthKit** via `react-native-health`: steps, HR, HRV, sleep, workouts,
  weight, etc. The app reads and pushes batches to `POST /v1/devices/apple-health/sync`.
- **Android — Health Connect** via `react-native-health-connect`. **Note:** Google Fit
  APIs are deprecated; **Health Connect** is the go-forward aggregator the doc's "Google
  Fit" intent maps to. We target Health Connect.

### Cloud APIs (server-side, via an aggregator)
- **Aggregator (Terra / Rook / Spike)** unifies Fitbit, Garmin, Oura, Whoop, **Dexcom**,
  **FreeStyle Libre** (CGM) behind one OAuth + webhook surface — avoids N bespoke
  integrations for Gen 1. Data lands via `POST /v1/webhooks/terra` (signature-verified)
  → normalized into `metric_samples`.
- Direct vendor integrations (e.g. Dexcom's own API) are a later optimization if the
  aggregator's coverage/latency proves insufficient for a specific device.

### Normalization
All sources map to the canonical `metric_samples` schema (`metric`, `value`, `unit`,
`ts`, `source`). Adapters live in `apps/api` (cloud) and `apps/mobile/src/lib/health`
(on-device) behind a common interface, so the dashboard/patterns code is
source-agnostic.

## 7.4 Provider discovery data

- **NPPES** (NPI registry) for the base provider directory + specialties/addresses.
- **Payer network / directory APIs** for in/out-of-network status (per-payer; start
  with the largest, expand). Geocode + distance for "near me."
- Supports the doc's uninsured/underinsured path by surfacing affordable/sliding-scale
  and community options as a provider `type`.

## 7.5 Cost & latency controls

- Route trivial turns to a fast model; reserve the top model for assessment/summaries.
- Cache provider searches and daily summaries (Redis).
- Stream chat responses (SSE) so perceived latency stays low.
- Batch device ingestion; downsample timeseries server-side before charting.
