# Implementation Plan: foundation

Status: draft v0.2 for review
Module: foundation
Spec: `SPEC-foundation.md` (approved v0.1)
Task list: `tasks/todo.md` (F-01 to F-30, six phases, six checkpoints)
Phase: v1
Estimate: 5 weeks full-time, 6 weeks with a 20% buffer, 10 to 12 weeks at 20 hours per week

## Overview

Build the shell every later module depends on: a pnpm and Turborepo workspace, a
minimal Next.js app and worker, the design tokens and 14 base components, locale
routing, the env and error contracts, the local Docker stack, an empty database
baseline, CI, a preview deploy, Sentry, and the security paperwork.

The module ends when a fresh clone reaches a running, tested, preview-deployable
shell in 10 minutes or less, and every gate in `SPEC-foundation.md` can be shown to
fail when it should.

## Starting state

- Greenfield. The folder contains only specs and the palette comparison. There is
  no `package.json`, no `tasks/` folder, and no git repository.
- Development is on Windows. Docker Desktop with WSL2 is required for the local
  stack. All scripts must be cross-platform Node or pnpm scripts, never bash-only.
- `loopnote-github-issues.md` is the only surviving legacy document. It is reference
  material, not instructions, and it is the sole source of the LN-xxx issue bodies
  cited in `SPEC.md` and `CAPABILITY-MAP.md`.

## Decisions this plan makes

Locked decisions from `SPEC.md` are not reopened here. This plan adds:

1. Node current Active LTS (24 at time of writing), pnpm 10, pinned in `package.json`,
   `.nvmrc`, and `engines`. Confirm against Next.js support during F-01.
2. Check scripts (`env`, `i18n`, `contrast`) are TypeScript run through `tsx`, not
   shell, so they behave the same on Windows and CI.
3. Storybook uses the current Next.js framework, with the a11y addon and test-runner.
   F-06 is a timeboxed spike that proves this before components start.
4. ClamAV runs behind the Compose `scan` profile. The default boot stays fast; ingest
   turns scanning on later.
5. `/` redirects to `/id` or `/en`. Every route is explicit.
6. No Turborepo remote cache in v1.
7. The worker is a process with graceful shutdown and no queues yet. Queue wiring
   belongs to ingest.
8. The database baseline is the Drizzle client plus an empty migration. No domain
   tables.
9. Components ship in five small batches, not one large library task.
10. Docs and ADRs are batched at the end, except the stack spike note, which is
    written during F-06.

## Dependency graph

```
F-01 repo
 ├─ F-02 config
 │   ├─ F-03 web app
 │   │   ├─ F-05 test harness
 │   │   └─ F-06 compatibility spike
 │   │        └─ F-11 theme
 │   ├─ F-04 worker
 │   ├─ F-07 env
 │   ├─ F-08 error contract
 │   │   └─ F-09 health and 404
 │   └─ F-10 tokens
 │        ├─ F-11 theme
 │        └─ F-12 Storybook
 │             ├─ F-13 Button, Input, Textarea
 │             ├─ F-14 Select, Checkbox, Switch
 │             ├─ F-15 Dialog, Sheet, Tabs
 │             ├─ F-16 Badge, Skeleton, EmptyState
 │             └─ F-17 ErrorState, Toast
 ├─ F-18 locale routing (after F-11)
 │   └─ F-19 i18n checks
 ├─ F-20 Compose
 │   └─ F-21 Drizzle baseline
 └─ F-22 CI (after F-17, F-19, F-21)
      ├─ F-23 preview deploy
      └─ F-24 Sentry

F-24 -> F-25 threat model -> F-26 ASVS checklist
F-10 -> F-27 ADRs 0001 to 0003
F-22 -> F-28 ADRs 0004 to 0006
F-28 -> F-29 README and clean clone
F-29 -> F-30 red drill and sign-off
```

## Task index

| Id | Task | Size | Depends on |
|---|---|---|---|
| F-01 | Repo and workspace skeleton | M | - |
| F-02 | Shared config package | M | F-01 |
| F-03 | Minimal web app | M | F-02 |
| F-04 | Worker process | S | F-02 |
| F-05 | Test harness | M | F-03, F-04 |
| F-06 | Compatibility spike | S | F-03 |
| F-07 | Env contract | S | F-02 |
| F-08 | Error contract | S | F-02 |
| F-09 | Health route and 404 handler | S | F-08 |
| F-10 | Tokens package and contrast gate | M | F-02 |
| F-11 | Tailwind theme, Geist, no-flash | M | F-06, F-10 |
| F-12 | Storybook setup with axe | M | F-11 |
| F-13 | Button, Input, Textarea | M | F-12 |
| F-14 | Select, Checkbox, Switch | M | F-13 |
| F-15 | Dialog, Sheet, Tabs | M | F-14 |
| F-16 | Badge, Skeleton, EmptyState | M | F-15 |
| F-17 | ErrorState, Toast | S | F-16 |
| F-18 | Locale routing | M | F-11 |
| F-19 | i18n checks, formatting helper | S | F-18 |
| F-20 | Compose stack | S | F-07 |
| F-21 | Drizzle baseline | M | F-20 |
| F-22 | CI pipeline | M | F-17, F-19, F-21 |
| F-23 | Vercel preview | S | F-09, F-22 |
| F-24 | Sentry baseline | M | F-22 |
| F-25 | Threat model | S | F-24 |
| F-26 | ASVS L2 checklist | S | F-25 |
| F-27 | ADRs 0001 to 0003 | S | F-10 |
| F-28 | ADRs 0004 to 0006 | S | F-22 |
| F-29 | README and clean clone | S | F-28 |
| F-30 | Red drill and sign-off | S | F-29 |

Detailed cards live in `tasks/todo.md`.

## Phases and checkpoints

### Phase 1: Shell, F-01 to F-06

- [ ] `pnpm install` and `pnpm verify` green on a clean clone.
- [ ] `pnpm dev` serves the web page and the worker starts and stops cleanly.
- [ ] The Playwright smoke test passes.
- [ ] The stack spike ends with a go or no-go note and pinned versions.
- [ ] Human review before Phase 2.

### Phase 2: Contracts, tokens, theme, F-07 to F-11

- [ ] Health returns 200 with no-store, and an unknown route returns problem+json.
- [ ] A deliberate unlisted env read fails `pnpm env:check`.
- [ ] `pnpm tokens:contrast` passes, and fails when a token is darkened or lightened
      beyond its threshold.
- [ ] Dark preference paints dark on first paint.
- [ ] Human review before Phase 3.

### Phase 3: Components and Storybook, F-12 to F-17

- [ ] All 14 components have light and dark, `id` and `en` stories.
- [ ] `pnpm build-storybook` and `pnpm storybook:test` are green.
- [ ] No component uses default shadcn styling or a raw hex value.
- [ ] Human review before Phase 4.

### Phase 4: Locale, stack, database, F-18 to F-21

- [ ] `/` redirects to `/id` or `/en`, and the choice persists.
- [ ] `pnpm i18n:check` fails on a one-sided key.
- [ ] `pnpm infra:up` reaches healthy on Postgres, Redis, MinIO, and Mailpit.
- [ ] `pnpm db:migrate` creates the migrations table, and `pnpm db:studio` opens.
- [ ] Human review before Phase 5.

### Phase 5: CI, preview, Sentry, F-22 to F-24

- [ ] A pull request runs verify, Storybook a11y, and E2E jobs.
- [ ] The preview URL renders the harness page and the health route.
- [ ] Sentry receives a development test event with no PII.
- [ ] Human review before Phase 6.

### Phase 6: Docs and exit, F-25 to F-30

- [ ] Threat model, ASVS checklist, and six ADRs exist and are linked from README.
- [ ] A clean clone reaches running in 10 minutes or less, timed and recorded.
- [ ] The red drill proves env, contrast, i18n, and a11y gates fail when broken.
- [ ] All 18 acceptance criteria in `SPEC-foundation.md` have evidence.
- [ ] Human sign-off. No v1.1 or v2 work starts before this.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tailwind v4, shadcn, and Storybook versions drift | High | F-06 spike first. Pin versions. If Storybook cannot use the Next builder, build stories with Vite and record the ADR. A Tailwind downgrade needs a spec change |
| Next App Router and next-intl API changes | Medium | F-18 early in Phase 4. Test the redirect before building pages |
| Theme flash with server rendering | Medium | Inline script before paint, cookie, and a Playwright first-paint test |
| Windows Docker and ClamAV slow or unstable | Medium | ClamAV behind the `scan` profile. Document WSL2 and volume mounts |
| Sentry captures request bodies or tokens | High | `sendDefaultPii: false`, scrub unit test, no bodies, cookies, or auth headers |
| Storybook test-runner flaky in CI | Medium | Run against a built Storybook, retries 1, axe only, no visual diff in foundation |
| Scope creep into auth, tables, or upload | High | Boundaries in the spec. Stop and write an ADR before adding anything |
| Five-week estimate is optimistic | Medium | 20% buffer, phase checkpoints, part-time doubles the range |
| Node 24 not supported by the chosen Next version | Low | Verify at F-01. Fall back to Node 22 LTS with an ADR |
| Vercel or Sentry account setup delays | Low | Create both accounts in week 1, before Phase 5 |

## Verification strategy

Every task ends with its own verification green. Phase checkpoints add the integration
checks above. At the end, F-30 runs a deliberate-failure drill:

1. Add a `process.env.UNLISTED` read. Confirm `pnpm env:check` fails and names it.
2. Lower `--accent` contrast below 4.5:1. Confirm `pnpm tokens:contrast` fails.
3. Remove one key from `messages/en.json`. Confirm `pnpm i18n:check` fails.
4. Add an image without alt text to one story. Confirm `pnpm storybook:test` fails.
5. Revert all four. Confirm `pnpm verify:full` is green.

The drill is the proof that the gates are real, not decorative.

## Parallelization

This is one developer. The graph allows a few reorderings, not true parallelism:

- F-04 can run before or after F-03.
- F-07, F-08, and F-10 are independent and can be done in any order.
- Docs F-25 to F-28 can be drafted while waiting for CI or account setup.
- Nothing in Phase 3 should run before Storybook is proven by F-12.

If a second agent is added later, split only along the graph and never let two agents
edit the same package. No worktree is needed for a solo module.

## Out of scope

Auth, sessions, user tables, domain schema, upload, storage flow, AI calls, landing
content, pricing, legal pages, billing, admin, offline sync, native code, Terraform,
ECS, OTel, and analytics. If any appears, stop and check the spec before adding it.

## Open questions

1. Full-time or part-time. The 5-week estimate assumes full-time.
2. GitHub repository owner and name. Recommendation: private `loopnote`, owner
   confirmed before F-01.
3. Vercel account and region. Recommendation: the region closest to Jakarta that the
   plan supports.
4. Sentry organization, project, and region.
5. Node 24 LTS versus Node 22 LTS. Verify Next.js support at F-01.
6. Storybook test-runner versus Playwright-only axe. Recommendation: test-runner.
7. ClamAV default off. Recommendation: keep the `scan` profile.
8. Root redirect to locale. Recommendation: yes.
9. Turborepo remote cache. Recommendation: no for now.
