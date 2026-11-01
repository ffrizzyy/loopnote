# Loopnote Platform: GitHub Issue Backlog

Derived from the earlier platform spec (since removed). Replaces the earlier `ISSUES.md`, which covered the first prototype-era plan. Each issue is written to paste into GitHub Issues: the heading is the title, everything under it is the body.

Section references like "Spec 8.6" point to the numbered sections of the platform spec.

---

## Conventions

**Estimates:** S = under a day, M = a few days, L = about a week, XL = more than a week (split it before starting).

**Milestones (create these in GitHub first)**

| Milestone | Goal |
|---|---|
| M0 Foundation | Auth, data, upload, AI pipeline, design tokens, secure by default |
| M1 Core loop | Import, review, library, study, search, insights |
| M2 Multi-device and money | Sync, PWA, devices, billing, exports, admin |
| M3 Launch | Landing page, hardening, pen test, legal, pilot data |
| M4 Expand | Native scan, semantic search, teams, integrations, API |

**Labels to create**

`area:web` `area:api` `area:worker` `area:db` `area:infra` `area:design` `area:landing` `area:ml` `area:security` `area:a11y` `area:i18n` `area:docs` `type:feature` `type:chore` `type:spike` `type:bug` `priority:p0` `priority:p1` `priority:p2` `blocked`

**Definition of done (applies to every issue)**

- [ ] Tests added or updated (unit, integration, or end-to-end as fits)
- [ ] Works in light and dark themes and in `id` and `en` where UI is touched
- [ ] Loading, empty and error states exist where data is shown
- [ ] No visible em-dashes or en-dashes in copy
- [ ] Accessibility: keyboard operable, axe clean
- [ ] Security criteria below satisfied where the issue touches user data

**Security acceptance criteria (copy into any issue that reads or writes user data)**

- [ ] Query is scoped by `user_id` and covered by RLS
- [ ] Cross-tenant test: a second user gets `404` for this resource
- [ ] Input validated with a shared Zod schema
- [ ] No note text, image data, tokens or prompts in logs
- [ ] Rate limit and size limit considered

---

# M0 Foundation

### LN-001 Monorepo scaffolding and CI baseline
**Labels:** `area:infra` `type:chore` `priority:p0` | **Estimate:** M | **Spec:** 1.3, 1.5, 9.3

pnpm workspace with `apps/web`, `apps/worker`, `packages/{ui,schemas,db,pipeline,config}`, `infra`, `docs`.

- [ ] CI on every PR: typecheck, ESLint (jsx-a11y, security plugin), Prettier check, Vitest
- [ ] `.env.example` lists every variable name; CI fails if code reads an unlisted variable
- [ ] Branch protection on `main`, required review
- [ ] GitHub Actions pinned by commit SHA, OIDC for cloud access (no long-lived keys)
- [ ] README explains local setup in under 10 steps

### LN-002 Design tokens and Tailwind v4 theme
**Labels:** `area:design` `area:web` `type:feature` `priority:p0` | **Estimate:** M | **Spec:** 2.1 to 2.8

- [ ] CSS variables for all color tokens in light and dark, mapped into Tailwind `@theme`
- [ ] Radius, spacing, shadow, motion and z-index tokens as specified
- [ ] Geist Sans and Geist Mono via `next/font`, self-hosted
- [ ] Theme switch (light, dark, system) with no flash on load
- [ ] Contrast script in CI checks every text and background token pair at 4.5:1 (3:1 for large text) and fails on regression
- [ ] `prefers-reduced-motion` utility applied globally

### LN-003 Base component library and Storybook
**Labels:** `area:design` `area:web` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-002 | **Spec:** 2.9 to 2.11

- [ ] shadcn components restyled to tokens (none left in default state)
- [ ] Button variants: primary, secondary, ghost, destructive-outline
- [ ] Skeleton, EmptyState, ErrorState components
- [ ] Form field pattern: label above, helper text, error below
- [ ] Focus ring visible in both themes
- [ ] Storybook with light and dark, `id` and `en` stories, axe addon
- [ ] Icons only from `@phosphor-icons/react`, one weight globally

### LN-004 Internationalization (Indonesian and English)
**Labels:** `area:i18n` `area:web` `type:feature` `priority:p0` | **Estimate:** S | **Spec:** 1.1

- [ ] `next-intl` with `id` and `en`, locale from preference then `Accept-Language`
- [ ] Message files organized per route, missing-key check in CI
- [ ] Dates and numbers localized, IDR formatting helper
- [ ] Layout tolerates about 30% longer Indonesian strings (visual test)

### LN-005 Database schema, migrations and UUID identifiers
**Labels:** `area:db` `type:feature` `priority:p0` | **Estimate:** L | **Spec:** 7

- [ ] Drizzle schema for all tables in Spec 7
- [ ] Random UUID (v7) primary keys, no sequential integer IDs anywhere
- [ ] Migrations reversible, expand-then-contract convention documented
- [ ] `tsvector` columns with `indonesian` and `english` configs and GIN indexes
- [ ] Seed script with realistic, locale-appropriate sample data (no "John Doe")

### LN-006 Row-level security and cross-tenant test harness
**Labels:** `area:db` `area:security` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-005 | **Spec:** 8.2 (A01), 8.5

- [ ] RLS enabled on every table with `user_id`
- [ ] Application sets the per-request user context in the database session
- [ ] Reusable test helper that creates two users and asserts user B gets `404` on every resource of user A
- [ ] CI fails if a new user-owned table lacks an RLS policy

### LN-007 Email and password auth with verification and reset
**Labels:** `area:api` `area:security` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-005 | **Spec:** 5.1, 8.7

- [ ] Argon2id hashing, minimum length 12, no composition rules, paste allowed
- [ ] Breached-password check using k-anonymity
- [ ] Email verification with single-use link, resend cooldown
- [ ] Reset token valid 15 minutes, only the hash is stored, other sessions revoked on reset
- [ ] Identical response and timing for existing and unknown emails
- [ ] Per-account and per-IP throttling with exponential backoff, no permanent lockout

### LN-008 Passkeys, TOTP and recovery codes
**Labels:** `area:api` `area:security` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-007 | **Spec:** 8.7

- [ ] WebAuthn registration and login, multiple passkeys per account
- [ ] TOTP enrollment, secret stored encrypted
- [ ] Recovery codes shown once, stored hashed, single use
- [ ] Passkey prompt after signup and after first password login
- [ ] Optional Continue with Google (OIDC, PKCE, state, nonce)

### LN-009 Sessions, device records and new-device alerts
**Labels:** `area:api` `area:security` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-007 | **Spec:** 6.2

- [ ] 256-bit random token, stored as a hash, `__Host-` cookie (`HttpOnly; Secure; SameSite=Lax`)
- [ ] Idle timeout 7 days (sliding), absolute 30 days
- [ ] Session ID rotates on login, privilege change and password reset
- [ ] Device record created per sign-in (label, UA summary, country only)
- [ ] New-device email with "this wasn't me" link that revokes the session and forces reset
- [ ] Revoke one or all other sessions takes effect immediately (delete plus Redis denylist)
- [ ] Step-up check helper: strong auth within the last 10 minutes for sensitive actions

### LN-010 Security headers, CSP, CORS and CSRF
**Labels:** `area:web` `area:security` `type:feature` `priority:p0` | **Estimate:** M | **Spec:** 8.4

- [ ] CSP with nonces and `strict-dynamic`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'` (report-only first, then enforced)
- [ ] HSTS with preload, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP
- [ ] `Cache-Control: no-store` on authenticated responses
- [ ] `Origin`/`Host` verification and custom header requirement on mutating API routes
- [ ] CORS allowlist of the app origin only
- [ ] Automated header test in CI

### LN-011 Rate limiting and Turnstile
**Labels:** `area:api` `area:security` `type:feature` `priority:p0` | **Estimate:** M | **Spec:** 8.3 (API4, API6)

- [ ] Redis sliding-window limits per IP and per user, per endpoint class
- [ ] Turnstile on signup, reset and after repeated login failures
- [ ] Request body size caps
- [ ] Limit hits recorded for the admin abuse queue (no content)

### LN-012 Upload pipeline: presign, quarantine, validate, scan, re-encode
**Labels:** `area:api` `area:worker` `area:security` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-005, LN-013 | **Spec:** 8.6

- [ ] Presigned PUT with content-type and `content-length-range` conditions into a quarantine prefix
- [ ] Worker verifies magic bytes, size and dimensions
- [ ] ClamAV scan, infected files deleted and flagged
- [ ] `sharp` re-encode strips EXIF and GPS, HEIC converted
- [ ] Re-encoded file stored under a random key in a private bucket, SHA-256 recorded for dedupe
- [ ] Original upload deleted after processing
- [ ] Files served only through short-lived signed URLs on the cookieless user-content origin

### LN-013 Job queue and worker service
**Labels:** `area:worker` `type:feature` `priority:p0` | **Estimate:** M | **Spec:** 1.2

- [ ] BullMQ queues with retries, backoff and dead-letter handling
- [ ] Idempotent jobs (safe to run twice)
- [ ] Concurrency limits configurable per queue
- [ ] Job status exposed to the API (queued, processing, done, rejected, failed)
- [ ] Graceful shutdown

### LN-014 Detection and OCR call
**Labels:** `area:ml` `area:worker` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-012, LN-013 | **Spec:** 8.6

Port the prompt and schema from the prototype into `packages/pipeline` (TypeScript).

- [ ] Vision call returns `is_note`, `confidence`, `extracted_text`, `has_diagram`, `diagram_description`, `detected_language`
- [ ] Output validated against a strict Zod schema, malformed output retried once then marked failed
- [ ] Non-notes stop here with a stored reason
- [ ] Low confidence is flagged, not silently accepted or rejected
- [ ] `[unclear]` convention for illegible text
- [ ] Provider interface so the model can be swapped

### LN-015 Summarize, tag and flashcard call
**Labels:** `area:ml` `area:worker` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-014

- [ ] Returns `topic`, `summary`, `tags`, `flashcards` validated by Zod
- [ ] Non-study content returns an empty flashcards array rather than invented questions
- [ ] Flashcard fronts are real questions
- [ ] Output respects the language of the note (Indonesian or English)

### LN-016 Prompt-injection hardening and output safety
**Labels:** `area:ml` `area:security` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-014 | **Spec:** 8.6

- [ ] Extracted text is passed as quoted data with an explicit "content only" instruction
- [ ] Model has no tools and no network access
- [ ] Output lengths capped and rendered as text only (sanitized Markdown, never HTML)
- [ ] Test suite of hostile whiteboard texts (instructions, markup, script tags) with expected safe handling
- [ ] Each call contains only one note's content

### LN-017 AI usage logging, quotas and spend circuit breaker
**Labels:** `area:api` `area:worker` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-014 | **Spec:** 9.5

- [ ] Every call writes `ai_usage` (model, tokens, cost)
- [ ] Per-user monthly page quota enforced before processing
- [ ] Global daily spend ceiling pauses the queue and alerts
- [ ] Query for average cost per processed image and per user per month
- [ ] Duplicate images (same SHA-256) never reprocessed

### LN-018 Local development environment with mock LLM mode
**Labels:** `area:infra` `type:chore` `priority:p1` | **Estimate:** S | **Spec:** 9.2

- [ ] Docker Compose: Postgres, Redis, MinIO, Mailpit
- [ ] Mock LLM provider returning deterministic fake data (reuse the prototype's mock notes)
- [ ] One command boots the whole stack with seed data

### LN-019 Audit log
**Labels:** `area:api` `area:security` `type:feature` `priority:p1` | **Estimate:** S | **Spec:** 8.2 (A09)

- [ ] Append-only events: sign-in, failed sign-in burst, device added or revoked, password and passkey changes, export, delete, admin access
- [ ] IP stored as a keyed hash, no personal content
- [ ] Users can see their own security-relevant history

### LN-020 Terraform baseline and staging environment
**Labels:** `area:infra` `type:feature` `priority:p0` | **Estimate:** XL (split before starting) | **Spec:** 9.1

- [ ] VPC with public, private and isolated data subnets
- [ ] ECS Fargate services for web and worker, ALB, RDS Postgres, ElastiCache, S3 buckets, KMS keys, Secrets Manager
- [ ] No public buckets, minimal security groups, data stores have no internet route
- [ ] Terraform plans in PRs, applied by CI through OIDC
- [ ] Separate AWS accounts for staging and production
- [ ] IaC scanning (Checkov or Trivy) in CI

### LN-021 Threat model and ASVS L2 tracking
**Labels:** `area:security` `area:docs` `type:chore` `priority:p0` | **Estimate:** M | **Spec:** 8.1, 8.10

- [ ] `docs/threat-model.md` with STRIDE per feature area
- [ ] ASVS Level 2 checklist converted into tracked checkboxes with an owner per item
- [ ] OWASP Top 10 mapping re-checked against the newest published edition
- [ ] Abuse cases written for upload, import, auth and billing

---

# M1 Core loop

### LN-101 App shell
**Labels:** `area:web` `area:design` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-003, LN-009 | **Spec:** 5 (shell)

- [ ] Sidebar (collapsible), top bar, mobile bottom tab bar with safe-area inset
- [ ] Authenticated layout guard, redirect with return path validated against same-origin allowlist
- [ ] Usage meter and `SyncStatus` slots (icon plus word)
- [ ] Locale and theme loaded from preferences

### LN-102 Onboarding flow
**Labels:** `area:web` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-101 | **Spec:** 5.1

- [ ] Choose main use and language
- [ ] Guided first import
- [ ] Explains what is processed and by whom, before the first upload
- [ ] No background-scan permission requested

### LN-103 Import page
**Labels:** `area:web` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-012, LN-101 | **Spec:** 5.3

- [ ] Drag and drop, picker, clipboard paste, mobile camera capture
- [ ] Per-file progress, cancel, retry, clear failure reasons
- [ ] Pre-upload quota check
- [ ] Accepted types and size limits enforced on client and server
- [ ] Empty, loading and error states

### LN-104 Client-side downscale and duplicate detection
**Labels:** `area:web` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-103 | **Spec:** 5.3, 9.5

- [ ] Downscale to a maximum long edge before upload
- [ ] Perceptual hash warns about likely duplicates
- [ ] Server SHA-256 remains the authority
- [ ] Runs off the main thread (worker), INP stays under 200ms

### LN-105 Interactive and batch processing modes
**Labels:** `area:worker` `area:api` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-017 | **Spec:** 5.3, 9.5

- [ ] Small batches processed right away, large backlogs through the Batch API
- [ ] Status "Queued for batch processing" with expected window
- [ ] Threshold is configurable (set from pilot data)
- [ ] Results arrive in the same review queue regardless of mode

### LN-106 Home page
**Labels:** `area:web` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-101 | **Spec:** 5.2

- [ ] Due today card, needs-review count, recent imports with live state, usage meter
- [ ] Per-block skeletons and per-block error retry
- [ ] New-account empty state with one action

### LN-107 Review queue
**Labels:** `area:web` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-014, LN-015, LN-101 | **Spec:** 5.4

- [ ] Split view with `SourcePhotoViewer` (zoom, pan, rotate)
- [ ] Keep, Merge, Discard with keyboard shortcuts and a 10-second undo
- [ ] Discard permanently deletes image and extracted data after the undo window
- [ ] `ConfidenceBadge` (icon and word), low-confidence first
- [ ] "Not a note" tab with Restore
- [ ] Bulk accept for high-confidence items with a count confirmation
- [ ] Security criteria checklist satisfied

### LN-108 Transcript editor and note versions
**Labels:** `area:web` `area:api` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-107

- [ ] Autosaving editor, `[unclear]` spans highlighted
- [ ] `note_versions` written on edit, version history with restore
- [ ] Optimistic concurrency: stale write returns `409` and shows a merge view
- [ ] Rendering through sanitized Markdown only

### LN-109 Topics, tags and categorization suggestions
**Labels:** `area:api` `area:ml` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-015

- [ ] CRUD for topics and tags, `TopicPicker` with typeahead and create
- [ ] New notes get a suggested topic from tag and content similarity
- [ ] No automatic merge without user confirmation
- [ ] Rename, merge and split topics as explicit operations

### LN-110 Library and topic pages
**Labels:** `area:web` `type:feature` `priority:p1` | **Estimate:** L | **Depends on:** LN-109 | **Spec:** 5.5, 5.6

- [ ] Grid and list toggle, filters (tag, date, has diagram, language), sorting
- [ ] Multi-select with bulk move, delete, export
- [ ] Topic page with notes timeline and deck
- [ ] Topic summary regeneration on demand, counts against quota

### LN-111 Note detail page
**Labels:** `area:web` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-108 | **Spec:** 5.7

- [ ] Image viewer, transcript editor, summary, tags, flashcards
- [ ] Move topic, re-run processing (quota aware), delete
- [ ] Processing details (time, model) without exposing prompts

### LN-112 Flashcards and spaced-repetition scheduler
**Labels:** `area:api` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-015 | **Spec:** 5.8

- [ ] Flashcard CRUD with versioning
- [ ] SM-2 style scheduling computed on the server
- [ ] `review_logs` append-only, scheduling state recomputed from the log
- [ ] Unit tests against known SM-2 behavior
- [ ] Daily new-card limit respected

### LN-113 Study session UI
**Labels:** `area:web` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-112

- [ ] `FlashcardFlip`, `RatingBar` (keys 1 to 4, Space to flip)
- [ ] Show source photo, undo last rating, inline edit, report, suspend
- [ ] Session summary and next due time
- [ ] Empty state when nothing is due
- [ ] Respects reduced motion for the flip

### LN-114 Search and command palette
**Labels:** `area:web` `area:api` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-005 | **Spec:** 5.9

- [ ] Full-text search with `indonesian` and `english` configurations
- [ ] Filters and highlighted snippets
- [ ] `cmdk` palette with navigation and actions
- [ ] Query content never logged

### LN-115 Insights page
**Labels:** `area:web` `type:feature` `priority:p2` | **Estimate:** M | **Depends on:** LN-112 | **Spec:** 5.10

- [ ] Reviews per day, retention, card maturity, import-to-kept funnel, usage
- [ ] `ReviewHeatmap` with labels
- [ ] Data-table view and CSV export for every chart
- [ ] Two series colors only (accent and neutral), distinguished by more than color

### LN-116 Report a problem pipeline
**Labels:** `area:web` `area:api` `type:feature` `priority:p1` | **Estimate:** S | **Depends on:** LN-107

- [ ] Report button on notes and cards (bad detection, bad summary, bad card)
- [ ] Stored with minimal context, visible in the admin flagged queue
- [ ] User sees confirmation and can add a short note

### LN-117 State audit: loading, empty, error
**Labels:** `area:web` `area:design` `type:chore` `priority:p1` | **Estimate:** S | **Depends on:** LN-110, LN-113

- [ ] Every M1 page checked for all four states in both themes and locales

---

# M2 Multi-device and money

### LN-201 Change feed
**Labels:** `area:api` `area:db` `type:feature` `priority:p0` | **Estimate:** L | **Spec:** 6.3

- [ ] `change_log` written in the same transaction as every mutation
- [ ] `GET /api/v1/changes?since=<seq>` with cursor pagination
- [ ] Tombstones for deletions
- [ ] Tests for ordering and no missed changes under concurrency

### LN-202 Server-sent events stream
**Labels:** `area:api` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-201

- [ ] One authenticated stream per device carrying only "changed up to seq N"
- [ ] Redis fan-out across web instances
- [ ] Reconnect with backoff, polling fallback on focus
- [ ] Stream closes when the session is revoked

### LN-203 Idempotency keys and optimistic concurrency
**Labels:** `area:api` `type:feature` `priority:p0` | **Estimate:** M | **Spec:** 6.3, 6.4

- [ ] `Idempotency-Key` honored on all mutating endpoints
- [ ] `If-Match` version checks, `409` returns the current record
- [ ] Conflict rules implemented per entity as in Spec 6.4

### LN-204 Offline mutation queue and conflict UI
**Labels:** `area:web` `type:feature` `priority:p1` | **Estimate:** L | **Depends on:** LN-203 | **Spec:** 6.5

- [ ] TanStack Query mutations persisted to IndexedDB and replayed with idempotency keys
- [ ] Merge view for conflicting transcript edits
- [ ] `SyncStatus` shows Synced, Syncing, Offline with icon and word
- [ ] `BroadcastChannel` keeps tabs consistent, sign-out propagates

### LN-205 PWA: manifest, service worker, share target, offline study
**Labels:** `area:web` `type:feature` `priority:p1` | **Estimate:** L | **Depends on:** LN-204 | **Spec:** 6.5, 5.3

- [ ] Installable manifest, service worker precaches shell and static assets only
- [ ] Authenticated API responses never cached
- [ ] Opt-in offline study stores due card text only, cleared on sign-out, revoke and after a maximum age
- [ ] Web Share Target on supported Android browsers
- [ ] Verified on iOS 16.4+ installed PWA

### LN-206 Devices and sessions settings
**Labels:** `area:web` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-009 | **Spec:** 5.11

- [ ] List devices with name, browser and OS, country, first seen, last active, current marker
- [ ] Rename, revoke one, sign out of all other devices
- [ ] Revoking the current device signs out cleanly
- [ ] Audit event recorded

### LN-207 Security settings
**Labels:** `area:web` `area:security` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-008

- [ ] Manage passkeys, password, TOTP and recovery codes
- [ ] Recent sign-in history
- [ ] Step-up required for changing email, removing a factor, deleting data

### LN-208 Privacy and data controls
**Labels:** `area:web` `area:api` `area:security` `type:feature` `priority:p0` | **Estimate:** L | **Spec:** 5.11, 8.8

- [ ] Async data export as ZIP with expiring signed link
- [ ] Delete all notes, delete account with grace period and hard-delete job
- [ ] Deletion removes database rows and storage objects, writes a completion audit record
- [ ] Plain explanation of processing and providers, analytics opt-out, consent records

### LN-209 Billing and entitlements
**Labels:** `area:api` `area:web` `type:feature` `priority:p0` | **Estimate:** XL (split before starting) | **Depends on:** LN-017 | **Spec:** 1.2, 5.11

- [ ] Provider integration (decision in Spec 12) with hosted checkout, IDR methods
- [ ] Webhooks with verified signatures, idempotent handling
- [ ] `subscriptions` as the source of truth for entitlements
- [ ] Upgrade, cancel, invoices
- [ ] Failure and retry states visible to the user

### LN-210 Plan quotas and usage meter
**Labels:** `area:web` `area:api` `type:feature` `priority:p1` | **Estimate:** S | **Depends on:** LN-209

- [ ] Free and Pro limits enforced server-side, fair-use limit stated in the UI
- [ ] Meter and near-limit warning with upgrade path

### LN-211 Exports
**Labels:** `area:worker` `area:web` `type:feature` `priority:p2` | **Estimate:** M | **Depends on:** LN-110

- [ ] Markdown, PDF, CSV and Anki package from topic or selection
- [ ] Generated asynchronously, delivered through signed links

### LN-212 Notifications
**Labels:** `area:worker` `area:web` `type:feature` `priority:p2` | **Estimate:** M

- [ ] Due-cards email digest at the chosen time, unsubscribe works
- [ ] New-device alerts cannot be disabled
- [ ] Optional web push with no note content in payloads

### LN-213 Admin console
**Labels:** `area:web` `area:security` `type:feature` `priority:p1` | **Estimate:** L | **Spec:** 5.13

- [ ] Separate origin and deployment
- [ ] SSO plus hardware key, IP allowlist
- [ ] Cost dashboard, flagged results queue, abuse queue, feature flags
- [ ] Image access only through an audited break-glass action

### LN-214 Observability and alerting
**Labels:** `area:infra` `type:feature` `priority:p0` | **Estimate:** M | **Spec:** 9.4

- [ ] OpenTelemetry traces, metrics and structured logs with correlation IDs
- [ ] Sentry for errors
- [ ] Log scrubbing test proves no note text, tokens or prompts appear
- [ ] Alerts: 5xx, queue age, failed jobs, spend threshold, WAF and auth anomalies

---

# M3 Launch

### LN-301 Landing: foundation, navigation and hero
**Labels:** `area:landing` `area:design` `type:feature` `priority:p0` | **Estimate:** M | **Depends on:** LN-002, LN-004 | **Spec:** 4.2 (S1, S2)

- [ ] One-line nav at 64px, becomes solid after scroll
- [ ] Hero fits the first viewport at 1280x720 and 390x844, headline at most 2 lines, subtext at most 20 words
- [ ] Real hero photograph (generated or shot), no overlays, `priority` loading, AVIF or WebP
- [ ] Entry motion and magnetic CTA through `useMotionValue`, off under reduced motion
- [ ] Copy in `id` and `en`

### LN-302 Landing: problem section and masonry
**Labels:** `area:landing` `type:feature` `priority:p1` | **Estimate:** S | **Depends on:** LN-301 | **Spec:** 4.2 (S3)

- [ ] Editorial statement plus masonry of real photographs
- [ ] Scroll reveal with `whileInView`, once
- [ ] Collapses to two columns, then one

### LN-303 Landing: how it works (GSAP sticky stack)
**Labels:** `area:landing` `type:feature` `priority:p1` | **Estimate:** L | **Depends on:** LN-301 | **Spec:** 4.2 (S4)

- [ ] Four pinned cards (`start: "top top"`, `pin: true`, `pinSpacing: false`), scale driven by the next card
- [ ] Each card renders a real component with real sample data
- [ ] Plain vertical list under 768px and under reduced motion
- [ ] `ctx.revert()` cleanup, GSAP isolated from Motion, lazy loaded

### LN-304 Landing: features bento and try-it demo
**Labels:** `area:landing` `type:feature` `priority:p1` | **Estimate:** L | **Depends on:** LN-301 | **Spec:** 4.2 (S5, S6)

- [ ] Bento with exactly 5 cells, no empty cell, at least 3 cells with real visual variation
- [ ] Live `FlashcardFlip` cell
- [ ] Demo with three real sample photos and precomputed results, no uploads and no LLM calls
- [ ] Demo results region is `aria-live="polite"`, tabs keyboard operable

### LN-305 Landing: privacy, pricing, FAQ, close and footer
**Labels:** `area:landing` `type:feature` `priority:p1` | **Estimate:** M | **Depends on:** LN-301 | **Spec:** 4.2 (S7 to S10)

- [ ] Privacy section includes the plain statement that content is read by an AI service and is not end-to-end encrypted
- [ ] Pricing pair with annual toggle, IDR, fair-use limit written next to the plan, team waitlist with double opt-in
- [ ] FAQ accordion, answers at most 40 words, honest answer on automatic scanning
- [ ] Footer without version string, locale strip or social badge row

### LN-306 Landing: SEO, hreflang, social cards and analytics
**Labels:** `area:landing` `type:feature` `priority:p1` | **Estimate:** S

- [ ] Per-locale metadata, `hreflang`, sitemap, robots
- [ ] Open Graph and Twitter images
- [ ] `SoftwareApplication` JSON-LD
- [ ] Cookie-less analytics only

### LN-307 Landing pre-flight QA
**Labels:** `area:landing` `area:a11y` `type:chore` `priority:p0` | **Estimate:** M | **Depends on:** LN-301 to LN-306 | **Spec:** 4.3

- [ ] Zero em-dashes or en-dashes in both locales (grep check in CI)
- [ ] Count of uppercase-tracked micro-labels is 4 or fewer
- [ ] One CTA label per intent, none wrap at desktop in `id` or `en`
- [ ] Contrast checked for every button, form and link in both themes
- [ ] No invented logos, quotes, numbers or user counts
- [ ] Lighthouse mobile results recorded, LCP under 2.5s, CLS under 0.1
- [ ] Screen reader pass (VoiceOver and NVDA)

### LN-308 Pricing, security and legal pages
**Labels:** `area:landing` `area:docs` `type:feature` `priority:p0` | **Estimate:** M | **Spec:** 3

- [ ] `/pricing` with full plan comparison and FAQ
- [ ] `/security` overview and disclosure policy
- [ ] `/privacy` and `/terms` (content supplied by legal review in LN-312)

### LN-309 Production infrastructure hardening
**Labels:** `area:infra` `area:security` `type:feature` `priority:p0` | **Estimate:** L | **Depends on:** LN-020 | **Spec:** 9.1, 9.4

- [ ] Cloudflare WAF, bot rules, origin locked with authenticated origin pulls
- [ ] Separate cookieless `usercontent` origin
- [ ] Multi-AZ database, PITR 35 days, S3 versioning and lifecycle
- [ ] Egress allowlist for workers (LLM, storage, email, payments only)
- [ ] Blue/green or rolling deploy with automatic rollback
- [ ] Restore drill completed once and documented

### LN-310 Penetration test and ASVS L2 sign-off
**Labels:** `area:security` `type:chore` `priority:p0` | **Estimate:** L | **Depends on:** LN-021

- [ ] Independent penetration test against staging
- [ ] No open critical or high findings at launch
- [ ] Every ASVS L2 item complete, or an exception with an owner and a date
- [ ] ZAP baseline and cross-tenant suite green on the release candidate

### LN-311 Disclosure policy, security.txt and incident runbook
**Labels:** `area:security` `area:docs` `type:chore` `priority:p0` | **Estimate:** M | **Spec:** 8.10

- [ ] `/.well-known/security.txt` (RFC 9116) and a published disclosure policy
- [ ] Incident response runbook with roles and notification steps
- [ ] Tabletop exercise held and notes filed

### LN-312 Privacy and legal review
**Labels:** `area:docs` `type:chore` `priority:p0` | **Estimate:** M | **Spec:** 8.9, 12

Not legal advice. Assign to counsel.

- [ ] UU PDP obligations, breach notification timeline, and GDPR if EU users are served
- [ ] Processor agreements with LLM, email, payment and hosting providers
- [ ] LLM provider retention and training terms confirmed and reflected in the privacy policy
- [ ] Minimum age and parental consent decision recorded
- [ ] Cross-border transfer disclosure

### LN-313 Load and cost test
**Labels:** `area:infra` `area:worker` `type:chore` `priority:p1` | **Estimate:** M

- [ ] Simulated import bursts, queue depth and processing latency recorded
- [ ] Measured cost per image compared with pricing assumptions
- [ ] Free quota and Pro fair-use limit confirmed or revised from the data

### LN-314 Pilot: Indonesian handwriting accuracy
**Labels:** `area:ml` `type:spike` `priority:p0` | **Estimate:** M | **Spec:** 12

- [ ] At least 30 real whiteboard, notebook and journal photos with varied handwriting and lighting
- [ ] Detection false-positive and false-negative rates measured
- [ ] Transcription quality recorded per language
- [ ] Landing and FAQ claims written only from these results

---

# M4 Expand

### LN-401 Spike: native client with background scan
**Labels:** `area:api` `type:spike` `priority:p2` | **Estimate:** L | **Spec:** 0.1, 12

- [ ] Compare React Native and fully native for PhotoKit and MediaStore access
- [ ] Prototype incremental scan since last visit with explicit opt-in
- [ ] Define the OAuth authorization code with PKCE flow against `/api/v1`
- [ ] Recommendation and effort estimate

### LN-402 Desktop folder watch
**Labels:** `area:web` `type:feature` `priority:p2` | **Estimate:** M | **Spec:** 5.3

- [ ] File System Access API on desktop Chromium, permission re-requested per session
- [ ] Incremental re-scan, only new files since the last visit
- [ ] Clear unsupported-browser message

### LN-403 Semantic search
**Labels:** `area:api` `area:ml` `type:feature` `priority:p2` | **Estimate:** L

- [ ] Embeddings stored with `pgvector`, per-user scoping covered by RLS and cross-tenant tests
- [ ] Hybrid ranking with full-text search
- [ ] Cost and latency measured

### LN-404 Team workspaces
**Labels:** `area:api` `area:web` `type:feature` `priority:p2` | **Estimate:** XL (split before starting) | **Spec:** 5.12

- [ ] Workspaces, roles (owner, editor, viewer), invitations
- [ ] Shared libraries with workspace-scoped RLS
- [ ] Per-workspace audit log
- [ ] Feature flag gated

### LN-405 Integrations
**Labels:** `area:api` `type:feature` `priority:p2` | **Estimate:** L

- [ ] Anki presets, Notion and Google Drive export
- [ ] OAuth scopes minimal, tokens stored encrypted
- [ ] If any URL fetching is introduced, SSRF controls from Spec 8.2 (A10) are in place first

### LN-406 Public API and partner licensing
**Labels:** `area:api` `type:feature` `priority:p2` | **Estimate:** XL (split before starting)

- [ ] API keys with scopes, hashing at rest, rotation
- [ ] Per-key rate limits and quotas
- [ ] Published OpenAPI document and versioning policy

### LN-407 Evaluate per-user envelope encryption
**Labels:** `area:security` `type:spike` `priority:p2` | **Estimate:** M | **Spec:** 8.8

- [ ] Prototype per-user data keys for extracted text
- [ ] Measure the impact on full-text search and processing
- [ ] Recommendation with trade-offs

---

## Suggested order of attack

1. **Week 1 to 2:** LN-001, LN-002, LN-005, LN-006, LN-018 (everything else builds on these)
2. **Next:** LN-007 to LN-011 (auth and perimeter), then LN-012 to LN-017 (upload and AI pipeline)
3. **In parallel from here:** LN-301 to LN-306 (landing page) only needs tokens and sample data, so a waitlist page can go live early
4. **Then M1** top to bottom, **M2**, and the launch gate in **M3**

73 issues in total: 21 in M0, 17 in M1, 14 in M2, 14 in M3, 7 in M4. LN-020, LN-209, LN-404 and LN-406 are marked XL and should be split into smaller issues before work starts.
