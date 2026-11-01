# Capability Map: Loopnote

Approved decomposition for spec, planning, and issue selection. Module ids are
stable and kebab-case. Downstream specs, plans, and commands select work by these
ids, never by filename guessing.

Phase is the release a module lands in. It is not a promise that everything is built
in one pass. See `SPEC.md` section 1.6 for the solo schedule.

## Modules

| Module id | Phase | Responsibility | Depends on | Exit gate |
|---|---|---|---|---|
| foundation | v1 | Monorepo, CI, tokens, i18n, env contract, local stack, Sentry | - | `pnpm verify` green on an empty app; mock stack boots; token contrast test passes on the locked coral darkened palette |
| data | v1 | Schema, migrations, RLS, seed data, cross-tenant test harness | foundation | Cross-tenant suite fails on an unprotected table and passes once RLS is added |
| identity | v1 | Accounts, passkey and OTP, sessions, devices, audit, account export, delete, age declaration | foundation, data | Passkey and OTP signup work; device revoke is immediate; delete and export complete |
| ingest | v1 | Upload slot, quarantine, validation, antivirus, re-encode, dedupe, storage, quota cap | identity, data | A chosen photo becomes a clean private object; duplicates and quota are enforced |
| understand | v1 | Vision and OCR, summary, cards, prompt-injection safety, eval harness | ingest | Eval set passes JSON validity and injection corpus; a photo becomes a validated note and cards |
| library | v1 | Review queue, note detail, topics, tags, full-text search, Markdown export | understand | Import to kept note to topic to search to Markdown works end to end |
| study | v1 | Flashcards, FSRS scheduler, sessions, review log | library | Unit tests match FSRS vectors; a session updates the schedule from logs |
| marketing | v1 | Landing, security, privacy, terms, beta explanation | foundation | LCP, CLS, INP budgets met; axe clean; claims audited against shipped features |
| sync | v1.1 | Change feed, SSE, idempotency, offline queue, PWA, conflict UI | data, library, study | Two devices converge; offline reviews merge without duplicates; conflict UI works |
| money | v1.1 | Plans, checkout, webhooks, entitlements, usage meter | identity, ingest, library | Webhook-driven entitlement changes quota; near-limit and failure states are visible |
| admin | v2 | Cost console, flags, flagged results, abuse queue | identity, data | Separate origin, SSO plus hardware key, IP allowlist, audited break-glass access |
| native | v2 | Photo library scan, on-device detector, permissions, delete originals | identity, ingest, sync | Spike proves access and precision; not scheduled until go criteria are met |

## Build order

```
v1:   foundation -> data -> identity -> ingest -> understand -> library -> study
      foundation -> marketing (parallel with library)

v1.1: library + study + data -> sync
      identity + ingest + library -> money

v2:   identity + data -> admin
      identity + ingest + sync -> native (spike gate first)
```

## Rules

- **Dependency direction only.** Arrows point one way. If two modules need each
  other, they are one module. No cycles.
- **Interfaces at the boundary.** The provider module owns the contract. `schemas`
  is the only package every module may import.
- **Approval gates.** No module spec is written before its dependencies are approved.
  Each module spec is reviewed before planning starts.
- **Phase gates.** No v1.1 or v2 issue moves into v1 until the beta exit criteria in
  `SPEC.md` section 1.4 pass.
- **Testability is the boundary test.** A module should be verifiable without
  reading another module's internals.

## Issue mapping

| Module | Phase | Issues |
|---|---|---|
| foundation | v1 | LN-001, LN-002, LN-003, LN-004, LN-018, LN-021 |
| data | v1 | LN-005, LN-006 |
| identity | v1 | LN-007 (rewrite for OTP), LN-008 (passkeys only), LN-009, LN-019, LN-206, LN-207 (reduced), LN-208, age declaration (new) |
| ingest | v1 | LN-012, LN-013, LN-017, LN-103, LN-104 |
| understand | v1 | LN-014, LN-015, LN-016, LN-116, LN-314 |
| library | v1 | LN-107, LN-108, LN-109, LN-110, LN-111, LN-114, LN-117, LN-211 (Markdown only) |
| study | v1 | LN-112 (FSRS), LN-113 |
| marketing | v1 | LN-301 to LN-308, with pricing replaced by the beta explanation |
| sync | v1.1 | LN-201, LN-202, LN-203, LN-204, LN-205 |
| money | v1.1 | LN-209, LN-210, LN-211 (PDF, CSV, Anki) |
| admin | v2 | LN-213 |
| native | v2 | LN-401, LN-402 |
| deferred | later | LN-105 (batch), LN-115 (insights), LN-214 (OTel), LN-403 (semantic search), LN-404 (teams), LN-405 (integrations), LN-406 (public API), LN-407 (envelope encryption) |

### Pulled forward or reduced

- `LN-008` keeps passkeys only. TOTP and recovery codes are v1.1.
- `LN-207` keeps the security settings shell, sign-in history, and step-up. TOTP
  management is deferred.
- `LN-211` ships Markdown in v1. PDF, CSV, and Anki are v1.1.
- `LN-005` creates `pgvector` but no embeddings table is populated in v1.

### Added

- Age declaration at signup, before any beta with minors.
- Sentry plus a log scrubbing test, folded into foundation.
- A beta operations note: how to pause processing and alert on spend.
