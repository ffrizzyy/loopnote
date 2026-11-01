# Spec: Loopnote

Status: approved v1.0 (2026-11-01)
Team: 1 developer, full-time assumption stated in section 1.6
Palette: B coral darkened, locked in decision 8 and section 2.4
Supersedes: the earlier product spec and platform spec, removed as sources of truth
Companion: `CAPABILITY-MAP.md` (module map, release phases, build order)

This is the root spec. It holds the six cross-cutting areas every module shares:
objective, commands, project structure, code style, testing strategy, and boundaries.
Module-specific acceptance criteria live in `SPEC-<module>.md`, written in dependency
order. Decisions where the source documents disagreed are recorded in section 9.

---

## 1. Objective

### 1.1 Problem

Students photograph whiteboards, slides, and notebook pages in class, then almost
never open the photo again. The material gets buried among personal photos, storage
fills up, and revision before exams turns into hunting for old screenshots.

### 1.2 V1 promise (locked)

Loopnote turns photos a user chooses into reviewed notes, summaries, and spaced
flashcards, on web, synced across that user's devices.

V1 is a free closed beta. It does **not** scan a photo gallery in the background,
does not work offline, and does not bill. Those require a native client, an offline
sync layer, and a payment provider, and each is scheduled after the beta proves the
core loop. Landing copy may not claim on-device detection or automatic gallery
scanning until the native client ships.

### 1.3 Target users

| Persona | Context | Main need | V1 |
|---|---|---|---|
| Rizky, university student, semester 5 | Photographs slides and boards in 3 to 6 courses | Find and revise material fast before midterms | Primary |
| Ayu, senior high school student | Shares a phone with family, limited storage | Free space without losing notes | Secondary |
| Pak Hendra, teacher or trainer | Photographs his own board work | Turn board work into handouts | Secondary |

Default product language is Indonesian (`id`), with English (`en`) secondary.

### 1.4 Success criteria (binary)

1. A new user signs up with a passkey or email OTP, imports 5 photos, and reaches a
   note with transcript, summary, and at least one card within 5 minutes on a 10 Mbps
   connection.
2. Every user-owned endpoint returns `404` to a second user, proven by the
   cross-tenant suite in CI on every pull request.
3. The same account opened in a second browser shows the same note, topics, and
   schedule after a refresh, with no duplicate rows. V1 has no realtime or offline
   sync, so this is server-authoritative multi-device access.
4. Twenty reviews written by one user update the schedule from `review_logs`, and
   replaying the log reproduces the same FSRS schedule deterministically.
5. Deleting a note removes database rows and storage objects within 7 days. Deleting
   an account hard-deletes all data after a 30-day grace period. Both write an audit
   record.
6. Landing page LCP is under 2.5 s, INP under 200 ms, CLS under 0.1 at 390 px,
   throttled. Lighthouse accessibility is 95 or higher.
7. axe is clean on landing, import, review, library, study, and settings in both
   themes and both locales.
8. No critical or high security findings in the beta. ASVS L2 self-assessment is
   complete, or each exception has an owner and a date. ZAP baseline is clean.
9. Interactive import processing is p95 under 60 s per page. Read API p95 is under
   300 ms at expected beta load.
10. Cost per processed page is measured, and the global daily spend ceiling pauses
    processing and alerts.
11. No note text, prompts, image bytes, or tokens appear in logs, traces, or
    analytics, proven by an automated scrubbing test.
12. Copy audit passes: no em or en dashes, no invented metrics, logos, or
    testimonials, and no on-device claim before the native client ships.
13. The closed beta runs 2 weeks with 10 to 20 students, crash-free sessions at
    99% or higher, and no open P1 security issue.

### 1.5 Non-goals for v1

Deferred to v1.1 (after the beta proves the loop):

- Offline study, mutation queue, service worker, installable PWA, realtime SSE.
- Billing, plans, quotas UI beyond a hard beta cap, invoices.
- PDF, CSV, and Anki exports. V1 exports Markdown only.
- TOTP, recovery codes, and 2FA. Email OTP is the recovery path.
- Insights charts, cram and quiz modes.
- Batch AI processing mode.

Deferred to v2 or later:

- Admin console as a separate app. V1 uses SQL, Sentry, and a protected internal route.
- Terraform, ECS, multi-AZ production hardening. V1 uses managed services.
- OpenTelemetry and Grafana. V1 uses Sentry and platform logs.
- Semantic search, "Ask your notes", embeddings ranking.
- Teams, shared libraries, collaboration, public API, integrations.
- Native gallery scan, photo permissions, on-device detection, deleting originals.
- End-to-end encryption. Content is encrypted in transit and at rest only.
- Stripe, international currencies, App Store or Play billing.

### 1.6 Delivery plan for one developer

The earlier 21-week, four-person roadmap is retired. The 73-issue
backlog is a menu, not a commitment. V1 pulls roughly 40 issues.

| Phase | Weeks, full-time | Outcome |
|---|---|---|
| 0 Foundation and data | 1 to 5 | CI, tokens, local stack, schema, RLS, cross-tenant harness |
| 1 Identity | 6 to 9 | Passkey and OTP, sessions, devices, delete, export, age declaration |
| 2 Ingest and understand | 10 to 17 | A chosen photo becomes a validated note and cards |
| 3 Library | 18 to 23 | Review, note detail, topics, tags, full-text search, Markdown |
| 4 Study | 24 to 26 | FSRS sessions, due counts, review log |
| 5 Marketing and legal prep | 27 to 29 | Landing, privacy, terms, security page |
| 6 Hardening and closed beta | 30 to 34 | Accessibility, load test, ZAP, 10 to 20 students |
| v1.1 | after beta | Sync and offline, billing, PDF and Anki exports |
| v2 | later | Admin, native app, insights, integrations |

Full-time means 35 to 40 focused hours per week. Part-time at 20 hours roughly
doubles every range. The prompt and OCR iteration in phase 2 is the schedule risk;
budget the upper end if Indonesian handwriting accuracy is unproven.

---

## 2. Tech stack (locked)

### 2.1 Core

| Layer | Choice |
|---|---|
| Language | TypeScript, `strict` true, no `any` in application code |
| Repo | pnpm workspaces + Turborepo |
| Web | Next.js App Router, React 19, Server Components by default |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss`, CSS-first config |
| Components | shadcn/ui on Radix, restyled to Loopnote tokens, never default state |
| Icons | `@phosphor-icons/react`, weight regular, one family |
| Fonts | Geist Sans and Geist Mono via `next/font`, self-hosted |
| Web motion | `motion/react`; GSAP + ScrollTrigger only inside the pinned landing island |
| Charts | Recharts through the shadcn chart wrapper, every chart has a table view. Not in v1 |
| i18n | `next-intl`, routes `id` and `en`, `id` default; `Intl` formatting uses `id-ID` |

### 2.2 Data and API

| Layer | Choice |
|---|---|
| API | Hono mounted at `/api/v1` in a Next.js route handler, `@hono/zod-openapi` |
| Database | PostgreSQL 16 with `pg_trgm`; `pgvector` installed but unused in v1 |
| ORM | Drizzle ORM + drizzle-kit, reviewed migrations only |
| Authorization | Application checks scoped by `user_id` plus Postgres RLS on every user-owned table |
| Cache and queues | Redis, BullMQ in `apps/worker` |
| Storage | S3-compatible private bucket, SSE-KMS, presigned uploads into quarantine |
| Images | `sharp` for re-encode, EXIF and GPS stripping, thumbnails |
| Auth | Better Auth, passkey-first with email OTP, no passwords. Fallback is Clerk, recorded in an ADR |
| AI | Anthropic API behind a provider interface, model name from config, never hardcoded |
| Scheduling | FSRS through `ts-fsrs`, recomputed from append-only review logs |
| Email | Resend (OTP, verification, new-device alerts) |
| Payments | Xendit or Midtrans for IDR. V1.1, decision pending |

### 2.3 Platform and quality

| Layer | Choice |
|---|---|
| Hosting (v1) | Vercel for web and the API route; managed Postgres (Neon or Supabase), managed Redis (Upstash), S3-compatible storage. Singapore or Jakarta region |
| Infrastructure as code | Terraform deferred to public launch. V1 uses provider dashboards and checked-in config |
| Observability | Sentry plus platform logs in v1. OpenTelemetry and Grafana later |
| Analytics | Cookie-less, consent-gated, optional in beta |
| Flags | DB-backed flags |
| CI/CD | GitHub Actions with OIDC, Docker for local only, Vercel deploys |
| Unit and integration | Vitest, Testing Library, Testcontainers |
| End-to-end | Playwright with `@axe-core/playwright` |
| Contract | OpenAPI diff in CI |
| Security tooling | Semgrep, CodeQL, gitleaks, Trivy, ZAP, SBOM |

Version policy: pick current stable majors at bootstrap, pin via lockfile, record in
an ADR. Adding a package requires the install command in the pull request.

Dropped from v1: Expo, NativeWind, Maestro, EAS, React Native, Core ML, TFLite,
SM-2, passwords and Argon2id, Stripe, store billing, Terraform, ECS, OTel.

### 2.4 Design tokens (locked)

Palette B, coral darkened. Navy neutrals stay. The light accent is darkened from
`#C9434A` to `#B93A41` so body-size links clear 4.5:1.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F6F7F9` | `#0F1117` |
| `--surface` | `#FCFCFD` | `#161923` |
| `--surface-2` | `#EEF0F4` | `#1D212C` |
| `--border` | `#E1E4EA` | `#2A2F3C` |
| `--border-strong` | `#C9CED8` | `#3A4050` |
| `--text` | `#14161F` | `#ECEEF3` |
| `--text-2` | `#444A5B` | `#B4B9C8` |
| `--text-3` | `#626879` | `#8C93A6` |
| `--accent` | `#B93A41` | `#F0787D` |
| `--accent-hover` | `#A33339` | `#F58F93` |
| `--accent-fg` | `#FFF9F8` | `#14161F` |
| `--accent-soft` | `#FBE9EA` | `#3A2023` |
| `--accent-soft-fg` | `#8E2A30` | `#F7A3A6` |
| `--success` | `#2B7A50` | `#5CC48C` |
| `--warning` | `#9A6412` | `#E0AE57` |
| `--danger` | `#A8232F` | `#F28B93` |

| Radius | Value | Use |
|---|---|---|
| `--r-sm` | 6 px | Chips inside tables and components |
| `--r-md` | 10 px | Buttons, inputs, selects, tabs, menu items |
| `--r-lg` | 16 px | Cards, panels, images, popovers |
| `--r-xl` | 20 px | Dialogs, sheets, command palette |
| full | 9999 px | Badges, avatars, switches, progress |

Rules:

- One accent only. No second brand color.
- Verify every pair with `pnpm tokens:contrast`. `--text-3` is for captions and
  large text only until measured.
- Destructive actions use an outlined or ink button, never the accent fill, because
  danger and accent are close in hue. Always with an icon and a verb.
- One theme at the root. No pure black or white. No section inverts mid-page.
- Motion dials: landing 4, app 3. Reduced motion collapses pinning, parallax, and
  loops to static.
- Status is never color only. Icon plus word.

---

## 3. Commands

These are the required script names. `LN-001` implements them and CI fails if any
is missing. Run from the repo root.

```bash
pnpm install --frozen-lockfile

pnpm dev                 # all apps, parallel
pnpm dev:mock            # same, with deterministic mock AI responses
pnpm infra:up            # Docker Compose: postgres, redis, minio, mailpit, clamav
pnpm infra:down

pnpm build
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check

pnpm test                # Vitest unit, run once
pnpm test:watch
pnpm test -- --coverage
pnpm test:integration    # Vitest + Testcontainers, real Postgres and Redis

pnpm e2e                 # Playwright, all projects
pnpm e2e -- --project=chromium
pnpm e2e:a11y            # axe pass on every page

pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:reset            # drop, migrate, seed, local only
pnpm db:studio

pnpm openapi:check       # fail on breaking API change without a version bump
pnpm tokens:contrast     # fail on any token pair below 4.5:1 (3:1 large text)
pnpm security:scan       # semgrep, gitleaks, trivy
pnpm verify              # typecheck, lint, test, openapi:check, tokens:contrast
pnpm verify:full         # verify plus integration and e2e
```

Rules:

- `pnpm verify` runs before every commit. CI runs `pnpm verify:full`.
- `pnpm dev:mock` must work offline with no AI key and deterministic responses.
- No global tool installs. Everything runs through pnpm scripts.
- Database tests never touch a shared database. Testcontainers or a per-run schema.

---

## 4. Project structure

```
loopnote/
  apps/
    web/
      src/app/(marketing)/        Landing, security, privacy, terms
      src/app/(auth)/             login, signup, verify, recover
      src/app/(app)/              Authenticated app shell and pages
      src/app/api/[[...route]]/   Hono mount at /api/v1
      src/components/             Web-only composed components
      src/server/
        auth/                     Session, step-up, device records
        http/                     Problem responses, middleware, rate limits
        repositories/             All database access, user-scoped
        routes/                   Hono route definitions
        services/                 Business logic, no HTTP types
    worker/
      src/queues/                 Queue definitions and schedulers
      src/jobs/                   Pipeline, thumbnails, exports, email, deletion
  packages/
    config/                       ESLint, tsconfig, Tailwind preset
    tokens/                       tokens.ts, tokens.css, contrast test
    ui/                           shadcn components, Storybook, stories
    schemas/                      Zod schemas, DTOs, error codes, OpenAPI pieces
    db/                           Drizzle schema, migrations, RLS policies, seed
    pipeline/                     Provider interface, prompts, output schemas, evals
  e2e/                            Playwright specs, visual baselines, fixtures
  tests/integration/              Cross-app integration tests
  infra/                          Empty until Terraform starts
  docs/
    adr/                          One decision per file
    threat-model.md
    runbooks/
  .github/workflows/
```

Rules:

- There is no `apps/api`. The API is the Hono mount inside `apps/web`.
- Unit tests sit next to the code as `*.test.ts`.
- Integration tests live in `tests/integration`. E2E lives in `e2e`.
- AI eval fixtures live in `packages/pipeline/evals`.
- Only `packages/schemas` may be imported by web, worker, and pipeline.
- Web imports `db` only through `server/repositories`, never directly in components.

---

## 5. Code style

```ts
// apps/web/src/server/routes/notes.ts
import { createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import { NoteSchema, ProblemSchema, noteIdParams } from "@loopnote/schemas";
import { requireSession } from "../auth/require-session";
import { problem } from "../http/problem";
import { findNoteForUser } from "../repositories/notes";

export const getNote = createRoute({
  method: "get",
  path: "/api/v1/notes/{id}",
  request: { params: noteIdParams },
  responses: {
    200: {
      content: { "application/json": { schema: NoteSchema } },
      description: "Note",
    },
    404: {
      content: { "application/problem+json": { schema: ProblemSchema } },
      description: "Not found",
    },
  },
});

export async function getNoteHandler(c: Context) {
  const session = await requireSession(c);
  const { id } = c.req.valid("param");
  const note = await findNoteForUser({ userId: session.userId, id });

  if (!note) return problem(c, 404, "note_not_found");
  return c.json(NoteSchema.parse(note), 200);
}
```

Conventions:

| Thing | Rule |
|---|---|
| Files | `kebab-case.ts`, except React components `PascalCase.tsx` |
| Components | PascalCase, one exported component per file |
| Hooks | `useThing`, client only |
| Zod | `<Entity>Schema` for output, `<Entity>Input` for input |
| Database | `snake_case`, plural tables, `user_id` on every user-owned row |
| API | Plural kebab resources, `/api/v1/...`, cursor pagination |
| Errors | RFC 9457 `application/problem+json`, stable machine `code` |
| IDs | UUIDv7, never sequential integers |
| Dates | UTC in storage, localized at the edge |

Rules:

- Server Components by default. `'use client'` only on leaves that need state,
  effects, or browser APIs.
- Never return a raw database row. Map to a DTO in `packages/schemas`.
- Ownership is enforced in the repository and by RLS. Missing or foreign records
  return `404`, never `403`.
- Validate at every boundary with Zod. Use `unknown` plus a parse, never `any`.
- No `@ts-ignore` or `eslint-disable` without a linked issue in the comment.
- No `dangerouslySetInnerHTML` on user or model content. Sanitized Markdown only.
- Components use tokens, never raw hex, arbitrary spacing, or ad hoc z-index values.
- Comments explain why. Do not narrate the code.
- Visible copy follows the product voice rules: plain verbs, one label per intent,
  no em or en dashes, no invented numbers.

---

## 6. Testing strategy

| Layer | Tool | Location | Gate |
|---|---|---|---|
| Unit | Vitest | Colocated `*.test.ts` | 80% lines on `packages/*/src`, 90% on auth, billing, scheduler |
| Integration | Vitest + Testcontainers | `tests/integration` | Real Postgres and Redis, RLS, queues, cross-tenant 404 |
| Contract | OpenAPI diff | CI | Breaking change fails without a version bump |
| E2E | Playwright | `e2e` | Signup, import, review, study, export, delete; axe on every page |
| Visual | Playwright screenshots | `e2e/visual` | Light and dark, `id` and `en`, 390 px and 1280 px, changed pages |
| AI eval | Custom harness | `packages/pipeline/evals` | 100% JSON schema validity, 100% safe handling of injection corpus, quality baseline recorded |
| Security | Semgrep, CodeQL, gitleaks, Trivy, ZAP | CI and nightly | No new high or critical finding |
| Performance | Lighthouse CI, k6 | CI and pre-launch | Budgets in section 1.4 |

Rules:

- Every bug fix starts with a failing test that reproduces it.
- Test names state behavior: `returns 404 when the note belongs to another user`.
- Coverage thresholds are enforced by `pnpm test -- --coverage`. Never lower a
  threshold to get green. Change it only through an approved ADR.
- RLS is tested against a real Postgres. Mocked authorization tests do not count.
- The cross-tenant helper creates two users and asserts user B gets `404` on every
  resource owned by user A.
- Prompt and model changes rerun the eval set before merge.
- Do not test library internals, shadcn primitives, or snapshot whole pages.
- Accessibility is a test, not a review: axe in CI plus a manual VoiceOver or NVDA
  pass on landing, import, review, and study before release.
- Solo rule: one vertical slice at a time. A slice ends with a passing integration
  or E2E test, not with "works when I click it".

---

## 7. Boundaries

### Always

- Run `pnpm verify` before every commit and `pnpm verify:full` before deploy.
- Scope every user-owned query by `user_id` and rely on RLS as the second layer.
- Validate input and output with shared Zod schemas.
- Ship loading, empty, and error states for every data surface.
- Check both themes and both locales for any UI change.
- Record a security-relevant audit event for auth, device, export, delete, and admin
  actions.
- Update this spec before changing behavior it describes.
- Conventional commits. Keep a rollback path for every deploy.
- One vertical slice at a time, tested before the next slice starts.

### Ask first

With one developer, the reviewer is a written decision. Record it before proceeding.

- Adding any dependency, with the install command in the pull request.
- Schema changes or migrations. Use expand then contract.
- Changes to auth, crypto, billing, RLS, CI/CD, or infrastructure.
- Changing a decision locked in section 9. Record an ADR and update this spec.
- Changing pricing, quotas, retention, or privacy copy.
- Adding a public API route or making a breaking OpenAPI change.
- Sending user content to a new third party.
- Adding scope from v1.1 or v2 into v1. The answer is no until the beta closes.
- Shipping to users under 18, or changing the age gate.

### Never

- Commit secrets. Log note text, prompts, image bytes, or tokens.
- Put auth tokens in JavaScript-readable storage.
- Use sequential IDs or return raw database rows.
- Use `dangerouslySetInnerHTML` on user or model content.
- Skip or delete a failing test, or lower coverage, to get green.
- Claim OWASP certification, or a level that was not verified.
- Invent metrics, logos, testimonials, or user counts.
- Use em or en dashes in visible copy.
- Ship default shadcn styling or raw hex values.
- Delete user data or device originals without explicit confirmation and an audit
  record.
- Fetch user-supplied URLs server-side.
- Let a photo leave the device without the user choosing it, in v1.
- Add v1.1 or v2 scope before the beta exit criteria in section 1.4 pass.

---

## 8. Non-negotiable security invariants

1. Deny by default. Every query is scoped by `user_id` and covered by RLS.
2. V1 only uploads photos the user chooses. No gallery access, no background scan.
3. Uploads go to quarantine first: magic-byte check, size and dimension caps,
   antivirus, then re-encode with EXIF and GPS stripped. Only the clean file is kept.
4. Images are served from a separate cookieless origin through signed URLs that
   expire in 60 to 120 seconds.
5. Model output must pass a strict JSON schema. Extracted text is delimited data and
   rendered as sanitized text. The model has no tools and no network.
6. Sessions use a `__Host-` `HttpOnly; Secure; SameSite=Lax` cookie. Only a hash is
   stored server-side. Rotation on login, privilege change, and reset. Revocation
   takes effect immediately through a Redis denylist.
7. No passwords in v1. Passkeys first, email OTP fallback, rate limited.
8. Per-user quotas, per-IP and per-user rate limits, and a global daily spend
   circuit breaker that pauses processing and alerts.
9. Audit log covers sign-in, failed sign-in bursts, device changes, factor changes,
   exports, deletes, and admin access. No content.
10. No user content in logs, traces, analytics, or error reports.
11. No service worker in v1. Authenticated responses use `Cache-Control: no-store`.

---

## 9. Decisions locked in this merge

| # | Decision | Locked | Why |
|---|---|---|---|
| 1 | V1 scope | Web first, free closed beta, native scan after a time-boxed spike | The browser cannot scan a gallery. Shipping the honest product protects trust and the only deadline that matters |
| 2 | Detection location | Server-side for web, on device only after the native client | Matches what v1 can do. Landing copy must not claim on-device detection |
| 3 | Backend topology | Hono in a Next.js route handler at `/api/v1`; no `apps/api` | One deployable, one OpenAPI contract, simpler solo hosting |
| 4 | Auth | Better Auth, passkey-first plus email OTP, no passwords. Fallback Clerk | TS-native, Drizzle adapter, self-hosted, no per-MAU cost. Fallback protects the schedule if plugin support is not production ready |
| 5 | Scheduler | FSRS via `ts-fsrs`, recomputed from `review_logs` | Better retention per review and the log design already supports recomputation |
| 6 | Vocabulary | `topics`, `captures`, `notes`, `flashcards` in code and API; UI says Topics, Notes, Cards | One set of names prevents drift between schema, API, and UI |
| 7 | Sync | V1 is server-authoritative multi-device only. `change_log`, SSE, and the offline queue are v1.1 | Removes the hardest module from the beta path |
| 8 | Design tokens | B coral darkened: accent `#B93A41` light, `#F0787D` dark, navy neutrals, radius 6/10/16/20, motion 4 | Chosen after a side-by-side. The darker light accent keeps the warmer coral while clearing link contrast at about 5.2:1 |
| 9 | Primary CTA | "Start free" / "Mulai gratis" | Concrete, matches the free beta, one label for one intent |
| 10 | Retention | Note and image delete purges within 7 days; account delete has a 30-day grace then hard delete; backups 35 days | Fast for content, considered for accounts, honest in the privacy policy |
| 11 | Payments | Xendit or Midtrans only, in v1.1. No Stripe, no store billing | No native app means no store rules. Billing is not needed to validate the loop |
| 12 | OWASP | ASVS L2, Top 10:2025, API Top 10:2023, LLM Top 10 | One edition for copy and checklists. Re-check at each milestone |
| 13 | Locale | Routes use `id` and `en`; formatting uses `id-ID` | Clean route segments, correct Indonesian date and number formats |
| 14 | Origin | Single origin with `/app` routes; separate `usercontent.<domain>` for images | `__Host-` cookies are host-only, so an `app.` subdomain would need a different auth design |
| 15 | Landing structure | Ten sections: nav, hero, problem, how it works, features, try it, privacy, how it is free, FAQ, close | Already mapped to issues. Pricing is replaced by a beta explanation until billing exists |
| 16 | Agent Activity | Import job history inside `/app/import` and Home. Full `/app/activity` belongs to the native module | Without on-device scanning there is no agent timeline worth a nav item |
| 17 | Delete originals | Out of v1, native module only | Requires OS photo-library write access and checksum verification |
| 18 | Hosting | Vercel plus managed Postgres, Redis, and storage. Terraform and ECS after public launch | Saves weeks of solo infrastructure work. The managed services still meet the security invariants |
| 19 | Release model | Free closed beta. Billing and plans in v1.1 | Entitlements, webhooks, and invoices are 3 to 5 weeks that do not validate the loop |
| 20 | Exports | Markdown only in v1. PDF, CSV, and Anki in v1.1 | Each format is a worker plus a template surface |
| 21 | Admin | SQL, Sentry, and a protected internal route in v1. Separate admin app in v2 | A second origin with SSO and hardware keys is not a beta requirement |
| 22 | Observability | Sentry and platform logs in v1. OTel and dashboards in v1.1 | Enough to run a beta, not a full on-call stack |
| 23 | Team plan | One developer, 34 weeks to closed beta full-time | The four-person, 21-week plan is not achievable solo. Stating it now prevents a failed deadline |

Backlog follow-ups created by these decisions:

- Rewrite `LN-007` for email OTP plus passkey; remove Argon2id and breached-password
  checks. Fold OTP into `LN-007` and keep `LN-008` for passkeys. Defer TOTP and
  recovery codes from `LN-008`.
- Update `LN-014` copy and tests so detection is server-side in v1.
- Replace SM-2 in `LN-112` with FSRS, `ts-fsrs`, and schedule tests from known FSRS
  vectors.
- Rename schema and issues from `subjects` to `topics`, `cards` to `flashcards`.
  Keep `captures` for the uploaded photo and pipeline state.
- Update `LN-301` to `LN-305` for the locked tokens, CTA, and the corrected bento
  claim. Remove the before/after slider.
- Update `LN-002` to the locked B coral darkened tokens and the 6/10/16/20 radius
  scale. The comparison record is `design/token-compare.html`.
- Defer `LN-201` to `LN-205` (sync, SSE, offline, PWA), `LN-209` and `LN-210`
  (billing), `LN-213` (admin), `LN-214` (OTel), `LN-115` (insights), `LN-105`
  (batch), and the PDF, CSV, and Anki parts of `LN-211`.
- Add an age declaration issue before any beta with minors.
- Defer `/download` and photo-permission issues to the native module.

---

## 10. Module index and build order

Full map: `CAPABILITY-MAP.md`. Phase is the release, not the code status.

| Order | Module | Phase | Spec | Depends on | Status |
|---|---|---|---|---|---|
| 1 | foundation | v1 | `SPEC-foundation.md` | - | Approved v0.1. Plan and 30 task cards written, not started |
| 2 | data | v1 | `SPEC-data.md` | foundation | Not written |
| 3 | identity | v1 | `SPEC-identity.md` | foundation, data | Not written |
| 4 | ingest | v1 | `SPEC-ingest.md` | identity, data | Not written |
| 5 | understand | v1 | `SPEC-understand.md` | ingest | Not written |
| 6 | library | v1 | `SPEC-library.md` | understand | Not written |
| 7 | study | v1 | `SPEC-study.md` | library | Not written |
| 8 | marketing | v1 | `SPEC-marketing.md` | foundation | Not written |
| 9 | sync | v1.1 | `SPEC-sync.md` | data, library, study | Not written |
| 10 | money | v1.1 | `SPEC-money.md` | identity, ingest, library | Not written |
| 11 | admin | v2 | `SPEC-admin.md` | identity, data | Not written |
| 12 | native | v2 | `SPEC-native.md` | identity, ingest, sync | Not written, spike first |

V1 build order: foundation, data, identity, ingest, understand, library, study.
Marketing starts once foundation and sample data exist and runs in parallel with
library. No module spec is written before its dependency is approved.

---

## 11. Open questions

1. Full-time or part-time. The 34-week plan assumes full-time. A 20-hour week roughly
   doubles it.
2. LLM provider: confirm Anthropic and the retention, training, and region terms in
   writing before privacy copy is final.
3. Minimum age and parental consent. Legal input required before any minor can sign up.
4. Native spike: owner, time box, and go criteria. Suggested: 2 weeks, measure
   PhotoKit and MediaStore access plus classifier precision on 30 real photos.
5. Retention windows and breach notification timeline, pending legal.
6. Brand, domain, and trademark check for "Loopnote".
7. Beta cohort: where the 10 to 20 students come from and who runs the sessions.
8. Payment provider for v1.1: Xendit versus Midtrans. Not blocking the beta.
9. Prices and fair-use limits. Placeholder is Rp 49,000 for Pro, set after cost data.
10. Anki export timing in v1.1. Confirm it stays ahead of PDF.

---

## 12. Approval

- [x] Scope, auth, scheduler, vocabulary, and retention are accepted.
- [ ] Timeline basis confirmed: full-time or part-time.
- [x] Palette accepted: B coral darkened, locked in decision 8 and section 2.4.
- [x] The six cross-cutting areas are accepted as written.
- [x] The capability map and release phases are accepted.
- [x] `SPEC-foundation.md` approved v0.1, with plan and 30 task cards in `tasks/`.
