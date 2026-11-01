# Spec: foundation

Status: draft v0.1 for review
Module: foundation
Phase: v1
Depends on: none
Root spec: `SPEC.md`. The six cross-cutting areas apply in full. This document adds
only what is specific to the foundation module.
Issues: LN-001, LN-002, LN-003 (reduced), LN-004, LN-018, LN-021 (partial), plus the
Sentry baseline.

Timeline: 5 weeks full-time, about 10 weeks at 20 hours per week. This is the first
module and the only one with no product surface. It is allowed to take the time,
because every later module pays for shortcuts here.

---

## 1. Objective

Turn a fresh clone into a running, tested, preview-deployable shell with the design
system, locales, environment contract, error contract, and CI gates that every later
module relies on.

Success is measured by what later modules do **not** have to build: tokens, base
components, error handling, env parsing, i18n plumbing, local services, and a red
CI when a security or accessibility rule breaks.

### 1.1 What this module is not

- No authentication, sessions, or user tables.
- No domain tables beyond the empty migration baseline.
- No upload, no storage flow, no AI calls.
- No landing content, pricing, or legal pages.
- No billing, admin, offline sync, or native code.
- No production infrastructure. A Vercel preview is the only deploy target.

---

## 2. What ships

| Area | Scope |
|---|---|
| Repo | pnpm workspaces + Turborepo, `apps/web`, `apps/worker`, `packages/{config,tokens,ui,schemas,db,pipeline}` |
| Tooling | TypeScript strict, ESLint with jsx-a11y and security plugins, Prettier, Vitest, Playwright |
| CI | Install, typecheck, lint, format check, unit tests, env check, token contrast, build, Storybook a11y, E2E smoke |
| Tokens | The locked B coral darkened table from `SPEC.md` 2.4, Tailwind v4 `@theme`, light and dark, no flash |
| Fonts | Geist Sans and Geist Mono through `next/font`, self-hosted |
| Components | 14 base components, each with a story, light and dark, `id` and `en`, axe clean |
| i18n | `next-intl` with `/id` and `/en`, key-set check, IDR and date formatting helper |
| Env | Typed parser, `.env.example` names only, CI check for unlisted reads |
| Errors | RFC 9457 `application/problem+json` helper and code registry |
| Health | `GET /api/v1/health`, no auth, `Cache-Control: no-store` |
| Local stack | Docker Compose: Postgres, Redis, MinIO, Mailpit. ClamAV behind the `scan` profile |
| Storybook | Current stable Storybook with the Next.js framework, test-runner plus axe |
| Sentry | Server and client init, release tagging, PII off, one documented dev test event |
| Docs | `docs/threat-model.md`, ASVS L2 checklist, six ADRs, README with a clean-clone check |

Components in scope: Button, Input, Textarea, Select, Checkbox, Switch, Dialog, Sheet,
Tabs, Badge, Skeleton, EmptyState, ErrorState, Toast. Everything else waits until a
module needs it. No popover, tooltip, table, chart, or command palette in foundation.

---

## 3. Interfaces exported to later modules

| Package or file | Export | Used by | Rule |
|---|---|---|---|
| `packages/config` | ESLint, tsconfig, Tailwind preset | every app and package | No local copies of the config |
| `packages/tokens` | `tokens` object, `tokens.css`, contrast pairs | web, Storybook, tests | The only place hex values exist |
| `packages/ui` | 14 components with variants | web | Tokens only, no raw hex, no default shadcn state |
| `packages/schemas` | `ProblemSchema`, `problemCode`, base DTO conventions | web, worker, pipeline | Error shape is fixed here, not per route |
| `packages/db` | Drizzle client, migration runner, empty baseline | data, identity, ingest | No domain tables yet |
| `packages/pipeline` | README only | understand | No runtime code until that module |
| `src/server/http/problem.ts` | `problem(c, status, code, detail?)` | every route | Every API error goes through it |
| `src/env.ts` | Parsed, typed config | every server entry point | `process.env` is never read elsewhere |
| `messages/{id,en}.json` | All user-facing strings | web | No hardcoded copy in components |

### 3.1 Error contract

```json
{
  "type": "https://loopnote.app/problems/note_not_found",
  "title": "Not found",
  "status": 404,
  "code": "note_not_found",
  "detail": "The note does not exist or you do not have access.",
  "requestId": "0193f2c4-7a1e-7c3b-9d2f-2f6a1c8b4e10"
}
```

Rules: no stack traces, no internal IDs, no content. `404` for missing or foreign
resources. The `code` set lives in `packages/schemas` and is append-only.

### 3.2 Locale contract

- Routes are prefixed: `/id/...` and `/en/...`.
- `/` redirects to `/id` or `/en` from `Accept-Language`, then a cookie.
- `id` is the default and the fallback.
- Formatting uses `id-ID` and `en` through one helper. No ad hoc `toLocaleString`.
- The key-set check fails CI when `id` and `en` diverge.

### 3.3 Theme contract

- `data-theme="light"` or `"dark"` is set by an inline script before first paint.
- Default follows `prefers-color-scheme`, then the user cookie.
- Root sets the theme once. No section flips theme mid-page.
- A Playwright test asserts the first painted background matches the preference.

---

## 4. Commands

Root commands are in `SPEC.md` section 3. This module adds:

```bash
pnpm storybook           # Storybook on 6006
pnpm build-storybook
pnpm storybook:test      # test-runner plus axe across all stories
pnpm env:check           # fail on a process.env read missing from .env.example
pnpm i18n:check          # fail when id and en key sets differ
pnpm tokens:contrast     # fail on any defined pair below 4.5:1 (3:1 large)
```

`pnpm verify` includes `env:check`, `i18n:check`, and `tokens:contrast`.
`pnpm verify:full` adds integration tests, Playwright, and `storybook:test`.

---

## 5. Acceptance criteria

1. A clean clone runs `pnpm install`, `pnpm infra:up`, `pnpm db:migrate`, `pnpm dev`
   and reaches the harness page in 10 minutes or less, with Docker already running.
   The README has 10 steps or fewer.
2. `pnpm verify` passes on a clean clone. CI runs the same command on every pull
   request, plus Storybook a11y and E2E smoke.
3. CI fails when a `process.env.X` read is not listed in `.env.example`, and the
   failure names the variable.
4. `.env.example` contains names only. No value resembles a secret.
5. A missing required variable at boot fails with a readable message naming the
   variable, not a stack trace.
6. `pnpm tokens:contrast` fails when any defined pair drops below 4.5:1 for body
   text or 3:1 for large text. The locked palette passes: text on background, text-2
   on surface, accent on background, accent-fg on accent, danger on background.
7. A dark-preference browser paints the dark background on first paint, with no
   light flash. Verified by Playwright before hydration.
8. `/` redirects to `/id` or `/en` from `Accept-Language`, and the choice persists.
9. `pnpm i18n:check` fails when a key exists in one locale only. No hardcoded
   user-facing string remains in the 14 components.
10. `GET /api/v1/health` returns `200` with `{ "status": "ok", "version": "..." }`,
    no auth, and `Cache-Control: no-store`.
11. An unknown API route returns `application/problem+json` with `code` and
    `requestId`, and no stack or internal detail.
12. All 14 components have stories in light and dark, `id` and `en`, and pass axe.
    None renders in default shadcn state.
13. `pnpm build-storybook` succeeds. `pnpm storybook:test` is green.
14. Sentry captures a deliberate development test event with environment and release,
    and no request body, note text, or token. The check is documented in the PR.
15. `docs/threat-model.md` covers STRIDE for auth, upload, AI, sync, billing, and
    admin. The ASVS L2 checklist exists with an owner per item.
16. Six ADRs exist and are linked from the README: monorepo and tooling, Tailwind v4
    and tokens, Better Auth, Vercel and managed services, FSRS, coral darkened palette.
17. A pull request gets a Vercel preview URL that renders the harness page and the
    health route.
18. First-load JavaScript on the harness route is 150 kB gzipped or less, and GSAP is
    not imported anywhere in the app shell.

---

## 6. Test plan

| Layer | What | Where |
|---|---|---|
| Unit | Env parser, contrast math, problem helper, key-set checker | Colocated `*.test.ts` |
| Contract | Problem shape and append-only code registry | `packages/schemas` |
| Integration | Health route, unknown-route problem response | `tests/integration` |
| E2E | Locale redirect, theme first paint, 404 problem, harness smoke | `e2e` |
| Visual | Harness page, light and dark, `id` and `en`, 390 and 1280 | `e2e/visual` |
| A11y | Every story through test-runner plus axe | Storybook |
| CI | `pnpm verify` and `pnpm verify:full` | GitHub Actions |

Test notes:

- The contrast test is a pure function with fixed expected values, so a token edit
  fails loudly instead of drifting.
- The theme test runs with `colorScheme: "dark"` and reads the computed background
  before the load event.
- The problem test asserts the content type, not just the status.
- No database is required in foundation. The DB client test only proves connection
  wiring against the Compose Postgres.

---

## 7. Boundaries

### Always

- Run `pnpm verify` before every commit.
- Use tokens. No raw hex, arbitrary spacing, or ad hoc z-index values.
- Read env through `src/env.ts`. Add every new name to `.env.example`.
- Send every API error through `problem()`.
- Put every user-facing string in `messages/{id,en}.json`.
- Give every component a story, four theme and locale variants, and an axe pass.
- Record an ADR before changing a decision locked in `SPEC.md` section 9.

### Ask first

- Adding a component outside the 14 in scope.
- Adding a dependency that ships to the client.
- Changing the token table or the radius scale.
- Changing a required CI check.
- Adding a service to the default Compose stack.
- Changing the locale or theme contract.

### Never

- Add auth, domain tables, upload, AI, billing, or admin code here.
- Put secrets in `.env.example`, the repo, or a client bundle.
- Read `process.env` outside `src/env.ts`.
- Ship default shadcn visuals.
- Disable the contrast, env, i18n, or a11y checks to get green.
- Commit a Storybook build, coverage output, or screenshots as source.

---

## 8. Build order inside the module

1. Repo, workspaces, TypeScript, ESLint, Prettier, and the root scripts.
2. Env contract, health route, problem contract, and their tests.
3. Tokens, Tailwind v4 theme, Geist, theme script, and the no-flash test.
4. 14 components, Storybook, four variants each, axe.
5. i18n routing, messages, formatting helper, key-set check.
6. Compose stack, Drizzle client, empty migration baseline.
7. CI, Vercel preview, Sentry, log scrubbing test.
8. Threat model, ASVS checklist, six ADRs, README clean-clone pass.

Each slice ends with its tests green before the next starts.

---

## 9. Evidence for review

- Clean-clone timing, with the machine and Docker version noted.
- CI run link with every required check green.
- Vercel preview URL.
- Storybook build and the axe report.
- Contrast report for every defined pair.
- Four theme and locale screenshots of the harness page.
- Redacted Sentry test event.
- Links to the threat model, ASVS checklist, and six ADRs.

---

## 10. Open questions

1. Full-time or part-time. The 5-week estimate assumes full-time.
2. Storybook test-runner versus Playwright-only axe. Recommendation: test-runner.
3. Sentry organization, region, and whether preview uses a separate project.
4. ClamAV stays behind the `scan` profile. Recommendation: yes, it is too slow for a
   default boot and ingest enables it.
5. Node and pnpm pins. Recommendation: current Active LTS (Node 24 at time of
   writing) and pnpm 10, confirmed against Next.js support at bootstrap.
6. Whether `/` redirects to `/id` or renders Indonesian at root. Recommendation:
   redirect, so every URL is explicit and `hreflang` stays simple.
7. Turborepo remote cache. Recommendation: no, solo does not need it yet.
