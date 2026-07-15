# @healthy-companion/safety-rules

**Safety-critical. Read before editing.**

Deterministic detection of acute, life-threatening red flags in user-entered health
text (and, optionally, structured context). This package is the platform's
non-bypassable safety gate:

- It runs **before any LLM or medical-engine call**, on **both** the client (for an
  instant emergency banner) and the **server** (authoritative).
- It is **deterministic** — no probabilistic model participates in the decision to
  escalate an emergency. A model can never suppress a match here.
- It is intentionally **high-recall** (biased toward escalating). False positives cost a
  user a dismissible "if this is an emergency, call 911" prompt; false negatives are
  unacceptable.

## What it is NOT

- Not a diagnosis engine. It answers one question: *"Does this look like it could be an
  acute emergency that must route to emergency services right now?"*
- Not a replacement for the medical engine (Infermedica) or clinical judgment.

## Design

Each rule is a `RedFlagRule` with an `id`, `severity`, human-readable `category`, a set
of trigger patterns, optional negation/qualifier handling, and the emergency `actions`
to surface. `evaluate(text, context?)` normalizes the input and returns all matches,
sorted by severity, plus a top-level `escalate` boolean and the recommended response.

## Maintenance rules

1. Every rule change requires a test. Coverage of the red-flag corpus gates CI merge.
2. Never lower recall to reduce false positives without sign-off.
3. Keep it dependency-free and side-effect-free so it can run identically on RN and Node.
