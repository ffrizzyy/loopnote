# Task List: foundation

Status: draft v0.1 for review
Spec: `SPEC-foundation.md` (approved v0.1)
Plan: `tasks/plan.md`
Module: foundation, phase v1
Tasks: F-01 to F-30, six phases, six checkpoints

This is the working checklist. Each card should finish in one focused session, roughly
1 to 4 hours, and ends with its own verification green. A phase does not close until
its checkpoint passes and a human reviews it.

Size key: S = 1 to 2 files, M = 3 to 5 files. Nothing in this module is L. If a card
turns out to be L, split it before starting.

Rules that apply to every card:

- Run `pnpm verify` before every commit.
- No auth, domain tables, upload, AI, billing, admin, or landing content. Those
  belong to later modules.
- No raw hex outside `packages/tokens`. No `process.env` outside `src/env.ts`.
- Windows is the dev machine. Scripts are Node or pnpm, never bash-only.
- Every task that fails a gate leaves a note in `docs/foundation-evidence.md`.

---

# Phase 1: Shell

## F-01: Repo and workspace skeleton

**Description:** Turn the folder into a pnpm workspace with Turborepo, create the
empty app and package stubs, pin Node and pnpm, and make the first commit. Confirm
the Node and pnpm pins against Next.js support before going further, because a
version change after this point touches every lockfile and CI cache key.

**Acceptance criteria:**
- [x] Repo adopted in place, with `.gitignore` covering `node_modules`, `.next`,
      `.turbo`, `coverage`, `storybook-static`, and `.env*` except `.env.example`.
- [x] `package.json` has `packageManager: "pnpm@12.11.2"` and `engines.node` at
      `>=24 <25`. `.nvmrc` matches.
- [x] `pnpm-workspace.yaml` lists `apps/*` and `packages/*`.
- [x] Stubs exist for `apps/web`, `apps/worker`, and
      `packages/{config,tokens,ui,schemas,db,pipeline}`. Each carries the
      `@loopnote/<name>` name and resolves through the workspace.
- [x] `turbo.json` declares `build`, `lint`, `typecheck`, `test`, and `dev`, with
      `dev` uncached and persistent.
- [x] Root scripts exist for what the skeleton can actually run: `dev`, `build`,
      `typecheck`, `lint`, `format`, `format:check`, `test`, `verify`. Each later
      script is added by the card that implements it. F-22 adds the guard that the
      full list in `SPEC.md` section 3 exists before CI is switched on.
- [x] Toolchain pins are confirmed against real peer ranges and recorded in
      `docs/spikes/toolchain-baseline.md`. TypeScript 7 and ESLint 10 were rejected
      with a stated reason.

**Verification:**
- [x] `pnpm install` succeeds from an empty `node_modules`.
- [x] `pnpm exec turbo --version` prints the pinned version.
- [x] `git status` is clean after the first commit.
- [x] Manual: delete `node_modules`, reinstall, confirm no missing workspace errors.

**Depends on:** none

**Files likely touched:**
- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.gitignore`,
  `.gitattributes`, `.editorconfig`, `.prettierrc.json`,
  `docs/spikes/toolchain-baseline.md`

**Size:** M

---

## F-02: Shared config package

**Description:** Ship `packages/config` so every workspace shares one TypeScript
preset, one ESLint flat config, and one Prettier config. This is what stops twelve
packages drifting into twelve styles. The Tailwind preset is added later in F-11,
not here.

**Acceptance criteria:**
- [x] `packages/config` exports `tsconfig/base.json`, `tsconfig/react.json`, and
      `tsconfig/node.json`, all with `strict: true` and no implicit any.
- [x] ESLint flat config enables `jsx-a11y`, `eslint-plugin-security`, import order,
      `no-explicit-any` as error, and unused variable detection.
- [x] Prettier config is shared at the root. No package carries its own copy.
- [x] `pnpm lint` fails on a deliberate `any`, a missing `alt`, and an unused
      variable. Confirmed with a throwaway file, then removed.

**Verification:**
- [x] `pnpm typecheck` passes on every package.
- [x] `pnpm lint` and `pnpm format:check` pass.
- [x] Manual: introduce one violation per rule group, confirm lint names the file and
      rule, revert. All three fired in one run.

**Depends on:** F-01

**Files likely touched:**
- `packages/config/package.json`, `packages/config/eslint/base.js`,
  `packages/config/eslint/react.js`, `packages/config/tsconfig/*.json`,
  `eslint.config.mjs`, `turbo.json`

**Size:** M

---

## F-03: Minimal web app

**Description:** Stand up Next.js App Router with React 19 and TypeScript strict,
rendering one harness page. No Tailwind, no theme, no locale, no API yet. This is the
smallest thing that can build and deploy, and the base for the compatibility spike.

**Acceptance criteria:**
- [x] `apps/web` runs on `pnpm dev` and serves a server-rendered harness page.
- [x] `pnpm build` succeeds and the harness route is prerendered as static content.
- [x] Server Components are the default. No `'use client'` in the harness page.
- [x] First-load JS on the harness route is measured and recorded:
      170.4 kB gzipped across the six chunks the served HTML references, with zero
      application JavaScript. Recorded in `docs/foundation-evidence.md`.
- [x] Budget decision. The measured floor exceeded the original 150 kB target in
      criterion 18, so the ceiling was raised to 200 kB with approval on 2026-11-08.
      `SPEC-foundation.md` and `docs/foundation-evidence.md` both record it.

**Verification:**
- [x] `pnpm build` succeeds.
- [x] `pnpm typecheck` passes.
- [x] Manual: `pnpm start` serves the page, returns 200, and the prerendered HTML
      contains the h1 with no console errors.

**Depends on:** F-02

**Files likely touched:**
- `apps/web/package.json`, `apps/web/next.config.ts`,
  `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`

**Size:** M

---

## F-04: Worker process

**Description:** Create `apps/worker` as a plain Node TypeScript process with a
heartbeat and graceful shutdown. No queues, no Redis, no database. Queue wiring
belongs to ingest and must not appear here.

**Acceptance criteria:**
- [x] `pnpm --filter @loopnote/worker dev` starts and emits one structured JSON line.
- [x] `SIGINT` and `SIGTERM` shut down cleanly with exit code 0, within 5 seconds.
      Covered by unit test, not by a live signal: Windows cannot deliver a signal to
      a child process, so a local kill is always a hard kill.
- [x] Shutdown handler is unit tested, including the double-signal and timeout cases.
- [x] No queue, database, or storage import exists in the worker yet.
- [x] A 30 second heartbeat keeps the process alive. Without it, Windows exits
      immediately, because a signal listener alone does not hold the event loop there.

**Verification:**
- [x] `pnpm test` includes and passes the four shutdown tests.
- [x] Manual: built worker logs one start line, stays alive, and a forced kill leaves
      no stderr. Graceful shutdown is proven at the unit level.

**Depends on:** F-02

**Files likely touched:**
- `apps/worker/package.json`, `apps/worker/src/index.ts`,
  `apps/worker/src/shutdown.ts`, `apps/worker/src/shutdown.test.ts`

**Size:** S

---

## F-05: Test harness

**Description:** Wire Vitest with per-package projects, coverage thresholds, and
Playwright with one smoke test. This is the harness every later task verifies
against, so it has to be right before components and contracts start landing.

**Acceptance criteria:**
- [x] `pnpm test` runs Vitest once across all packages. `pnpm test:watch` works.
      One root config with `{apps,packages}/**/*.test.ts` replaces per-package
      projects: Vitest 5 removed workspace files in favour of `projects`, and a
      single run gives one report instead of one process per package.
- [x] Coverage thresholds are enforced at 80 percent lines and statements, 80
      percent functions, 70 percent branches. `**/src/**/auth/**`,
      `**/src/**/billing/**`, and `**/src/**/scheduler/**` carry a reserved 90
      percent bar. Those globs match nothing today and the run still passes.
- [x] `pnpm test --coverage` and `pnpm test -- --coverage` both fail when a package
      drops below its threshold.
- [x] Playwright config has a chromium project, `baseURL` from `E2E_BASE_URL` with a
      loopback default, and one smoke spec that loads the harness page.
- [x] `pnpm e2e` passes against a locally built app.

**Verification:**
- [x] `pnpm test --coverage` passes. `shutdown.ts` measures 92.59 percent
      statements, 75 percent branches, 100 percent lines.
- [x] Threshold proof: an untested source file dropped the run to 78.12 percent
      statements and 56.25 percent branches, and the command exited 1 naming both
      failed thresholds. The probe was removed. Deleting one test case was tried
      first and did not move the numbers, because the remaining tests already
      covered those lines, so coverage was dropped with an uncovered file instead.
- [x] `pnpm e2e` passes, 2 tests: the server-rendered h1, and no console errors.

**Depends on:** F-03, F-04

**Files likely touched:**
- `vitest.config.ts`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `package.json`
- No `tests/setup.ts` yet: there is no DOM test to set up. It arrives with the
  component tests in F-13.

**Size:** M

---

## F-06: Compatibility spike

**Description:** Timeboxed to one day. Prove that Tailwind v4, the chosen Next
version, shadcn, Storybook with the Next framework, Node, pnpm, and `next-intl` can
coexist before any of them are wired into the product. This is the highest-risk
unknown in the module and it runs first.

**Acceptance criteria:**
- [x] `docs/spikes/stack-compatibility.md` lists exact pinned versions for every
      tool in the chain: Node, pnpm, TypeScript, Next, React, Tailwind, the PostCSS
      plugin, shadcn, Storybook, its Next Vite framework, Vite, Rolldown, next-intl,
      and the component level packages.
- [x] One throwaway branch, `spike/stack-compatibility`, rendered a Next component
      inside Storybook with `@storybook/nextjs-vite`. The screenshot is at
      `docs/spikes/stack-compatibility-storybook.png`: a client component reading a
      next-intl message, styled from `@theme` tokens, with zero console errors.
- [x] Go or no-go recorded per item, with the fallback named: `@storybook/react-vite`
      with a manual alias, Node 22 LTS, Tailwind 3.4, manual shadcn copies, and
      manual next-intl message loading.
- [x] Nothing from the spike merged except the note and the pins. The spike workspace
      lives only in the throwaway branch commit, which is deleted after this lands.

**Verification:**
- [x] `pnpm verify` still passes on `main` after the note lands.
- [x] Manual: every fallback in the note is a package name plus one config change, so
      one person can take it without a new decision.

**Depends on:** F-03

**Files likely touched:**
- `docs/spikes/stack-compatibility.md`,
  `docs/spikes/stack-compatibility-storybook.png`

**Size:** S

---

## Checkpoint: Phase 1, after F-01 to F-06

- [x] `pnpm install` then `pnpm verify` is green on a clean clone.
- [x] `pnpm dev` serves the harness page and starts the worker.
- [x] `pnpm e2e` smoke passes.
- [x] The spike note ends in a go or no-go with pinned versions.
- [ ] Human review before Phase 2.

---

# Phase 2: Contracts, tokens, theme

## F-07: Env contract

**Description:** One typed parser, one `.env.example` with names only, and a check
that fails CI when someone reads a variable that is not listed. A missing required
variable must fail with a readable message that names it, never a stack trace.

**Acceptance criteria:**
- [ ] `apps/web/src/env.ts` and `apps/worker/src/env.ts` parse and freeze config
      through a shared Zod factory in `packages/config`.
- [ ] A required variable that is missing at boot prints one line naming the variable
      and exits non-zero.
- [ ] `pnpm env:check` scans source for `process.env` reads, compares them to
      `.env.example`, and fails naming any unlisted variable.
- [ ] `.env.example` has names and safe placeholders only. Nothing resembles a real
      secret.
- [ ] Reading `process.env` outside `src/env.ts` is a lint error, not just a review
      rule.

**Verification:**
- [ ] Add a `process.env.UNLISTED` read, confirm `pnpm env:check` fails and names it,
      revert.
- [ ] Unset a required variable, run the app, confirm the readable message.
- [ ] `pnpm test` covers the parser failure output.

**Depends on:** F-02

**Files likely touched:**
- `apps/web/src/env.ts`, `packages/config/src/env.ts`, `.env.example`,
  `scripts/env-check.ts`, `apps/web/src/env.test.ts`

**Size:** M

---

## F-08: Error contract

**Description:** Fix the RFC 9457 problem shape once, in `packages/schemas`, so no
route invents its own error envelope later. The code registry is append-only and
tested as such.

**Acceptance criteria:**
- [ ] `ProblemSchema` matches section 3.1 of the spec exactly and rejects extra
      fields, including `stack` and `detail` carrying internal IDs.
- [ ] `problemCode` is an append-only registry. A test fails if an existing code is
      removed or renamed.
- [ ] `problem(c, status, code, detail?)` sets
      `Content-Type: application/problem+json`, generates a UUIDv7 `requestId`, and
      returns no stack.
- [ ] Unit tests cover 400, 404, 429, and 500 shapes and the content type.

**Verification:**
- [ ] `pnpm test` green on the schema and helper.
- [ ] Remove one registry entry, confirm the append-only test fails, revert.

**Depends on:** F-02

**Files likely touched:**
- `packages/schemas/src/problem.ts`, `packages/schemas/src/problem.test.ts`,
  `apps/web/src/server/http/problem.ts`

**Size:** S

---

## F-09: Health route and 404 handler

**Description:** Mount Hono at `/api/v1` inside the Next route handler, add the health
route, and make unknown routes and thrown errors return the problem shape. This is
the first real API surface and the template every later route follows.

**Acceptance criteria:**
- [ ] Hono is mounted at `apps/web/src/app/api/[[...route]]/route.ts` and serves
      `/api/v1/health`.
- [ ] Health returns `200` with `{ status: "ok", version }`, no auth, and
      `Cache-Control: no-store`.
- [ ] `version` comes from the package version, not a hardcoded string.
- [ ] Unknown `/api/v1/*` routes return `404 application/problem+json` with `code`
      and `requestId`.
- [ ] Unhandled errors return `500` in the same shape, with no message from the error
      object.
- [ ] Integration test asserts the content type, not just the status code.

**Verification:**
- [ ] `pnpm test:integration` passes for health, unknown route, and thrown error.
- [ ] Manual: `curl -i` health and an unknown route, confirm headers.

**Depends on:** F-08

**Files likely touched:**
- `apps/web/src/app/api/[[...route]]/route.ts`, `apps/web/src/server/app.ts`,
  `apps/web/src/server/routes/health.ts`, `tests/integration/api.test.ts`

**Size:** M

---

## F-10: Tokens package and contrast gate

**Description:** Make `packages/tokens` the only place a hex value exists, and make
contrast a test rather than an opinion. Gate the locked coral darkened palette with
real WCAG math and fixed expected values.

**Acceptance criteria:**
- [ ] `tokens.ts` holds the full table from `SPEC.md` section 2.4, typed, with light
      and dark variants.
- [ ] `tokens.css` exposes the same values as custom properties on `:root` and
      `[data-theme="dark"]`.
- [ ] `scripts/contrast.ts` computes WCAG relative luminance and prints one row per
      defined pair with the ratio.
- [ ] `pnpm tokens:contrast` passes the locked palette: text on background, text-2 on
      surface, accent on background, accent-fg on accent, danger on background.
- [ ] Thresholds are 4.5:1 for body text and 3:1 for large text. `text-3` is marked
      caption-only until measured.
- [ ] A unit test pins expected ratios so a token edit fails loudly.
- [ ] Darkening or lightening one token beyond its threshold fails the command.

**Verification:**
- [ ] `pnpm tokens:contrast` prints the report and exits 0.
- [ ] Change `--accent` to `#C9434A`, confirm failure, revert.
- [ ] `pnpm test` green on the contrast function.

**Depends on:** F-02

**Files likely touched:**
- `packages/tokens/src/tokens.ts`, `packages/tokens/src/tokens.css`,
  `packages/tokens/src/contrast.ts`, `packages/tokens/scripts/contrast.ts`,
  `packages/tokens/src/contrast.test.ts`

**Size:** M

---

## F-11: Tailwind theme, Geist, no-flash

**Description:** Connect tokens to Tailwind v4 through `@theme`, load Geist Sans and
Geist Mono with `next/font`, and set the theme before first paint so a dark-preference
user never sees a light flash. This is the theme contract in section 3.3 of the spec,
made real and tested.

**Acceptance criteria:**
- [ ] Tailwind v4 runs through `@tailwindcss/postcss`. `@theme` maps every token to a
      CSS variable. No component uses a raw hex or an arbitrary spacing value.
- [ ] Radius scale is 6, 10, 16, 20, and full, exposed as utilities.
- [ ] Geist Sans and Geist Mono are self-hosted through `next/font`. No external font
      request.
- [ ] An inline script sets `data-theme` on `<html>` before first paint, reading the
      cookie first, then `prefers-color-scheme`, defaulting to light.
- [ ] Root sets the theme once. No section flips it mid-page.
- [ ] Playwright test with `colorScheme: "dark"` asserts the computed body background
      is `#0F1117` before hydration.
- [ ] `packages/config` exports the Tailwind preset, and no app carries its own copy.

**Verification:**
- [ ] `pnpm e2e` passes the first-paint test in dark and light.
- [ ] `pnpm tokens:contrast` still green after the mapping.
- [ ] Manual: throttle to slow 3G, load in dark mode, confirm no light flash.

**Depends on:** F-06, F-10

**Files likely touched:**
- `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`,
  `packages/config/tailwind.preset.ts`, `e2e/theme.spec.ts`

**Size:** M

---

## Checkpoint: Phase 2, after F-07 to F-11

- [ ] Health returns 200 with no-store. Unknown routes return problem+json.
- [ ] An unlisted env read fails `pnpm env:check` and names the variable.
- [ ] `pnpm tokens:contrast` passes, and fails when a token is pushed past its
      threshold.
- [ ] Dark preference paints dark on first paint, proven in Playwright.
- [ ] No raw hex exists outside `packages/tokens`.
- [ ] Human review before Phase 3.

---

# Phase 3: Components and Storybook

## F-12: Storybook setup with axe

**Description:** Stand up Storybook with the framework proven in F-06, the a11y
addon, and the test runner. Add the theme and locale toolbar globals so every later
component gets four variants for free. Nothing in Phase 3 starts before this is green.

**Acceptance criteria:**
- [ ] `pnpm storybook` serves on port 6006 with tokens and Geist loaded.
- [ ] `pnpm build-storybook` succeeds and the static build is ignored by git.
- [ ] The a11y addon and `pnpm storybook:test` run axe on every story.
- [ ] Toolbar globals switch theme (light, dark) and locale (`id`, `en`).
- [ ] A probe story with an image missing `alt` makes `storybook:test` fail, then the
      probe is fixed and passes.
- [ ] Stories follow one naming convention and live beside components.

**Verification:**
- [ ] `pnpm build-storybook` succeeds.
- [ ] `pnpm storybook:test` is green on the probe story.
- [ ] Manual: toggle theme and locale in the toolbar, confirm both apply.

**Depends on:** F-11

**Files likely touched:**
- `apps/web/.storybook/main.ts`, `apps/web/.storybook/preview.tsx`,
  `apps/web/src/stories/probe.stories.tsx`

**Size:** M

---

## F-13: Button, Input, Textarea

**Description:** The first three primitives, and the reference for everything after.
Button covers intent, size, loading, disabled, icon, and the destructive rule that
forbids the accent fill. Input and Textarea cover label, help, error, and
`aria-describedby` wiring.

**Acceptance criteria:**
- [ ] Button variants: primary, secondary, ghost, and destructive as outlined or ink,
      never accent fill. Sizes are sm, md, lg. Loading sets `aria-busy` and stays
      keyboard focusable.
- [ ] Input and Textarea render a visible label, optional help text, and an error that
      is announced through `aria-describedby` and `aria-invalid`.
- [ ] Focus-visible rings use the accent token and meet 3:1 against the surface.
- [ ] All strings come from `messages/{id,en}.json`. Nothing is hardcoded.
- [ ] Four stories each, light and dark, `id` and `en`, axe clean.
- [ ] No default shadcn visual state remains: no grey border, no default radius, no
      default ring.

**Verification:**
- [ ] `pnpm storybook:test` green.
- [ ] Keyboard pass: tab to each control, confirm visible focus and operable state.
- [ ] `pnpm lint` catches a raw hex in a component.

**Depends on:** F-12

**Files likely touched:**
- `packages/ui/src/button.tsx`, `packages/ui/src/input.tsx`,
  `packages/ui/src/textarea.tsx`, `packages/ui/src/stories/*.stories.tsx`,
  `apps/web/messages/{id,en}.json`

**Size:** M

---

## F-14: Select, Checkbox, Switch

**Description:** The three controls with real ARIA state, which is where most custom
component libraries break. Radix primitives, tokens only, announced state, and
keyboard operation with no mouse.

**Acceptance criteria:**
- [ ] Select supports keyboard open and close, typeahead, and a placeholder that is
      not a valid value.
- [ ] Checkbox and Switch are operable by Space, expose the correct `aria-checked`,
      and never signal state by color alone. Each has an icon or word.
- [ ] Disabled and error states exist and are announced.
- [ ] Four stories each, axe clean, no default shadcn styling.

**Verification:**
- [ ] `pnpm storybook:test` green.
- [ ] Manual: complete a form with keyboard only, no mouse.
- [ ] Manual: run one story through the OS screen reader, confirm state is spoken.

**Depends on:** F-13

**Files likely touched:**
- `packages/ui/src/select.tsx`, `packages/ui/src/checkbox.tsx`,
  `packages/ui/src/switch.tsx`, `packages/ui/src/stories/*.stories.tsx`

**Size:** M

---

## F-15: Dialog, Sheet, Tabs

**Description:** The three overlay and navigation surfaces. Focus trapping, escape,
scroll lock, and arrow-key tabs are the whole point of this card. Getting them wrong
is invisible until a keyboard user hits it.

**Acceptance criteria:**
- [ ] Dialog traps focus, closes on Escape, restores focus to the trigger, and locks
      body scroll. `aria-modal` and a labelled title are required by the API.
- [ ] Sheet is the same behavior on a side panel, full width under 640 px.
- [ ] Tabs move with arrow keys, expose `role="tablist"` correctly, and keep the
      active tab visible.
- [ ] Reduced motion collapses enter and exit animation to a fade or none.
- [ ] Four stories each, axe clean.

**Verification:**
- [ ] `pnpm storybook:test` green.
- [ ] Manual: open Dialog, tab through, press Escape, confirm focus returns to trigger.
- [ ] Manual: with reduced motion on, confirm no sliding animation.

**Depends on:** F-14

**Files likely touched:**
- `packages/ui/src/dialog.tsx`, `packages/ui/src/sheet.tsx`,
  `packages/ui/src/tabs.tsx`, `packages/ui/src/stories/*.stories.tsx`

**Size:** M

---

## F-16: Badge, Skeleton, EmptyState

**Description:** The three display primitives that carry status and loading. Badge
must never rely on color alone. Skeleton must not be announced as content.
EmptyState is the pattern every later list page reuses.

**Acceptance criteria:**
- [ ] Badge has neutral, success, warning, danger, and accent tones, each with a
      readable label or icon plus word.
- [ ] Skeleton is `aria-hidden` and respects reduced motion.
- [ ] EmptyState takes a title, one sentence of body copy, one primary action, and
      renders correctly with the action omitted.
- [ ] No component carries hardcoded copy. All strings come from messages.
- [ ] Four stories each, axe clean.

**Verification:**
- [ ] `pnpm storybook:test` green.
- [ ] Manual: confirm a screen reader skips every skeleton and reads every badge tone.

**Depends on:** F-15

**Files likely touched:**
- `packages/ui/src/badge.tsx`, `packages/ui/src/skeleton.tsx`,
  `packages/ui/src/empty-state.tsx`, `packages/ui/src/stories/*.stories.tsx`

**Size:** M

---

## F-17: ErrorState, Toast

**Description:** The two remaining primitives, both of which connect to the error
contract. ErrorState is what a failed request renders. Toast is the only surface
allowed to interrupt, so it is polite, bounded, and dismissible.

**Acceptance criteria:**
- [ ] ErrorState renders a problem `code`, a human message from messages, and one
      retry action. It never renders a stack or an internal ID.
- [ ] Toast uses a live region with `aria-live="polite"`, pauses on hover and focus,
      auto-dismisses after a stated duration, and has a close button.
- [ ] Error toasts use `role="alert"`. Success toasts do not grab focus.
- [ ] At most three toasts stack, and they are reachable by keyboard.
- [ ] Four stories each, axe clean.

**Verification:**
- [ ] `pnpm storybook:test` green.
- [ ] Manual: trigger three toasts, tab to the close button, dismiss with Enter.
- [ ] Manual: confirm a screen reader announces once, not twice.

**Depends on:** F-16

**Files likely touched:**
- `packages/ui/src/error-state.tsx`, `packages/ui/src/toast.tsx`,
  `packages/ui/src/stories/*.stories.tsx`

**Size:** S

---

## Checkpoint: Phase 3, after F-12 to F-17

- [ ] All 14 components exist with light and dark, `id` and `en` stories.
- [ ] `pnpm build-storybook` and `pnpm storybook:test` are green.
- [ ] Every component uses tokens only. No raw hex, no default shadcn state.
- [ ] Every interactive component is operable by keyboard alone.
- [ ] Human review before Phase 4.

---

# Phase 4: Locale, stack, database

## F-18: Locale routing

**Description:** Add `next-intl` with explicit `/id` and `/en` routes and a root
redirect that reads `Accept-Language`, then the cookie, then falls back to `id`. Every
URL stays explicit so `hreflang` is simple and no page has two addresses.

**Acceptance criteria:**
- [ ] Routes live under `/[locale]` with `id` and `en` only. Any other segment is a 404.
- [ ] `/` redirects to `/id` or `/en` from `Accept-Language`, then the locale cookie,
      then `id`. The choice is persisted in a cookie.
- [ ] `messages/{id,en}.json` exist and load per request.
- [ ] `hreflang` alternates and a canonical URL are emitted on every page.
- [ ] No page renders Indonesian copy at the root without a locale prefix.

**Verification:**
- [ ] `pnpm e2e` covers the redirect for `Accept-Language: id`, `en`, and absent.
- [ ] Manual: set the cookie, revisit `/`, confirm the stored choice wins.

**Depends on:** F-11

**Files likely touched:**
- `apps/web/src/middleware.ts`, `apps/web/src/i18n/routing.ts`,
  `apps/web/src/app/[locale]/layout.tsx`, `e2e/locale.spec.ts`

**Size:** M

---

## F-19: i18n checks and formatting helper

**Description:** Make translation drift a CI failure, and make date, number, and
currency formatting go through one helper instead of scattered `toLocaleString`
calls. Also guards the copy rule on dashes.

**Acceptance criteria:**
- [ ] `pnpm i18n:check` fails when a key exists in one locale only, when a value is
      empty, or when keys are nested inconsistently.
- [ ] The check also fails on an em dash or en dash in a user-facing string.
- [ ] `formatDate`, `formatNumber`, and `formatCurrency` live in one helper and use
      `id-ID` and `en` correctly. Currency is IDR only.
- [ ] Unit tests use fixed dates and numbers so results do not depend on the machine.
- [ ] No component in `packages/ui` contains a hardcoded user-facing string.

**Verification:**
- [ ] Remove one key from `messages/en.json`, confirm `pnpm i18n:check` fails, revert.
- [ ] Insert an em dash in one message, confirm failure, revert.
- [ ] `pnpm test` green on the formatter.

**Depends on:** F-18

**Files likely touched:**
- `scripts/i18n-check.ts`, `apps/web/src/lib/format.ts`,
  `apps/web/src/lib/format.test.ts`, `apps/web/messages/{id,en}.json`

**Size:** S

---

## F-20: Compose stack

**Description:** One command brings up Postgres, Redis, MinIO, and Mailpit, all
healthy, with ClamAV available only behind the `scan` profile. The default boot stays
under a minute so local development is not painful.

**Acceptance criteria:**
- [ ] `docker-compose.yml` defines Postgres 16, Redis 7, MinIO with console, and
      Mailpit, each with a healthcheck.
- [ ] ClamAV exists under `profiles: ["scan"]` and does not start by default.
- [ ] Named volumes persist data. Ports are documented in the README.
- [ ] `pnpm infra:up` waits for health and exits non-zero if any service fails.
- [ ] Works on Windows with Docker Desktop and WSL2. Any volume mount caveat is
      documented.

**Verification:**
- [ ] `pnpm infra:up` then `docker compose ps` shows all four healthy.
- [ ] Confirm ClamAV is absent from the default run and present with `--profile scan`.
- [ ] `pnpm infra:down` then `up` again, confirm data persists.

**Depends on:** F-07

**Files likely touched:**
- `docker-compose.yml`, `.env.example`, `package.json`, `docs/runbooks/local-stack.md`

**Size:** S

---

## F-21: Drizzle baseline

**Description:** Wire Drizzle and prove the migration runner against a real Postgres,
with no domain tables. This gives the data module a working pipeline instead of a
migration tool it has to debug on day one.

**Acceptance criteria:**
- [ ] `packages/db` exports a typed client factory that reads its URL from env and
      closes cleanly.
- [ ] `drizzle.config.ts` points at the local stack and the migrations folder.
- [ ] An empty baseline migration exists and `pnpm db:migrate` creates the migrations
      table.
- [ ] `pnpm db:generate`, `pnpm db:seed`, `pnpm db:studio`, and `pnpm db:reset` all
      exist and behave. Seed is a documented no-op.
- [ ] Integration test runs migrations against a Testcontainers Postgres and asserts
      the migrations table, not a shared database.
- [ ] No domain table, enum, or relation exists yet.

**Verification:**
- [ ] `pnpm test:integration` passes with Testcontainers.
- [ ] `pnpm db:migrate` on a fresh volume creates only the migrations table.
- [ ] `pnpm db:studio` opens.

**Depends on:** F-20

**Files likely touched:**
- `packages/db/src/client.ts`, `packages/db/drizzle.config.ts`,
  `packages/db/migrations/0000_init.sql`, `tests/integration/db.test.ts`,
  `packages/db/src/seed.ts`

**Size:** M

---

## Checkpoint: Phase 4, after F-18 to F-21

- [ ] `/` redirects to `/id` or `/en` and the choice persists.
- [ ] `pnpm i18n:check` fails on a one-sided key and on a dash in copy.
- [ ] `pnpm infra:up` reaches healthy on all four default services.
- [ ] `pnpm db:migrate` works, and `pnpm db:studio` opens.
- [ ] No domain table exists.
- [ ] Human review before Phase 5.

---

# Phase 5: CI, preview, Sentry

## F-22: CI pipeline

**Description:** Mirror `pnpm verify` and `pnpm verify:full` in GitHub Actions so the
gates run on every pull request, not just on the developer's machine. A check that
only exists locally is a habit, not a gate.

**Acceptance criteria:**
- [ ] Workflow runs install with `--frozen-lockfile`, typecheck, lint, format check,
      unit tests with coverage, `env:check`, `tokens:contrast`, build,
      Storybook build with a11y, and E2E smoke.
- [ ] pnpm store and Turbo cache are cached by lockfile hash. Concurrency cancels
      superseded runs.
- [ ] Jobs fail on the first real error and name the variable, token pair, or key that
      broke.
- [ ] Required status checks are enabled on the default branch. Merging is blocked
      while any is red.
- [ ] Total wall time is under 12 minutes on a warm cache.

**Verification:**
- [ ] Open a throwaway pull request with a broken test, confirm it fails and blocks.
- [ ] Confirm a clean pull request is green and mergeable.
- [ ] Record the run link in `docs/foundation-evidence.md`.

**Depends on:** F-17, F-19, F-21

**Files likely touched:**
- `.github/workflows/ci.yml`, `turbo.json`, `package.json`

**Size:** M

---

## F-23: Vercel preview

**Description:** Connect the repo, set environment variables per environment, and get
a preview URL for every pull request that serves the harness page and the health
route. This is the only deploy target in v1.

**Acceptance criteria:**
- [ ] Preview and production environments are separate, with separate env values and
      no secret in the client bundle.
- [ ] Region is the closest available to Jakarta. Node version matches the pin.
- [ ] A pull request gets a preview URL that renders the harness page and
      `/api/v1/health`.
- [ ] Previews send `X-Robots-Tag: noindex` and are not publicly discoverable.
- [ ] Build command is the same as CI. No Vercel-only build path.

**Verification:**
- [ ] Open a pull request, open the preview URL, curl the health route.
- [ ] Confirm no secret appears in the built client bundle.
- [ ] Record the URL in `docs/foundation-evidence.md`.

**Depends on:** F-09, F-22

**Files likely touched:**
- `vercel.json`, `apps/web/next.config.ts`, `docs/runbooks/deploy.md`

**Size:** S

---

## F-24: Sentry baseline

**Description:** Capture real errors with release tagging and no user content. The
risky part is not the SDK, it is the scrubbing, so the scrubbing gets a test.

**Acceptance criteria:**
- [ ] Server, client, and edge init exist, with `sendDefaultPii: false`.
- [ ] `beforeSend` strips cookies, authorization headers, request bodies, query
      strings, and any field matching note text or token patterns.
- [ ] Release and environment tags come from config, not a hardcoded string.
- [ ] Trace sample rate is low in preview and documented.
- [ ] A unit test feeds a synthetic event containing a body, a cookie, and a bearer
      token, and asserts none survive.
- [ ] One deliberate development event is captured and documented in the PR.

**Verification:**
- [ ] `pnpm test` green on the scrubber.
- [ ] Confirm the test event in Sentry shows environment, release, and no PII.
- [ ] Redact and link the event in `docs/foundation-evidence.md`.

**Depends on:** F-22

**Files likely touched:**
- `apps/web/sentry.server.config.ts`, `apps/web/sentry.client.config.ts`,
  `apps/web/src/server/observability/scrub.ts`,
  `apps/web/src/server/observability/scrub.test.ts`

**Size:** M

---

## Checkpoint: Phase 5, after F-22 to F-24

- [ ] A pull request runs verify, Storybook a11y, and E2E, and blocks on failure.
- [ ] The preview URL renders the harness page and the health route.
- [ ] Sentry received a test event with no PII, proven by the scrubber test.
- [ ] Human review before Phase 6.

---

# Phase 6: Docs and exit

## F-25: Threat model

**Description:** Write the threat model that later modules will extend, covering the
six surfaces the spec names: auth, upload, AI, sync, billing, and admin. Even the
unbuilt ones get modelled now, because a boundary drawn late is a rewrite.

**Acceptance criteria:**
- [ ] `docs/threat-model.md` states assets, actors, trust boundaries, and data flows.
- [ ] STRIDE is applied per boundary across auth, upload, AI, sync, billing, and admin.
- [ ] Every mitigation maps to a section 8 invariant, a later module, or an accepted
      risk with an owner and a date.
- [ ] The prompt-injection path for AI is described as a data flow, including what the
      model can and cannot reach.
- [ ] No marketing language. No claim of certification.

**Verification:**
- [ ] Manual read by the human reviewer.
- [ ] Check that every boundary has all six STRIDE letters or an explicit "not
      applicable" with a reason.

**Depends on:** F-24

**Files likely touched:**
- `docs/threat-model.md`

**Size:** S

---

## F-26: ASVS L2 checklist

**Description:** Turn the ASVS L2 commitment into a working checklist with a status
and an owner per item, so the beta gate is honest and the exceptions are visible.

**Acceptance criteria:**
- [ ] `docs/security/asvs-l2.md` lists every ASVS 4.0.3 L2 requirement with id,
      status, owner, evidence link, and target module.
- [ ] Status vocabulary is fixed: done, planned, deferred, not applicable. No blanks.
- [ ] Deferred items name the module and the issue. Not-applicable items state why.
- [ ] OWASP Top 10:2025 and API Top 10:2023 mapping tables are included. LLM Top 10 is
      scoped to the understand module.
- [ ] No claim of certification appears anywhere.

**Verification:**
- [ ] Script or manual count confirms zero blank statuses and zero blank owners.
- [ ] Human review before sign-off.

**Depends on:** F-25

**Files likely touched:**
- `docs/security/asvs-l2.md`

**Size:** S

---

## F-27: ADRs 0001 to 0003

**Description:** Record the three decisions that everything else inherits: monorepo
and tooling, Tailwind v4 with the token package, and the coral darkened palette. Write
the alternative that was rejected, because that is the part future readers need.

**Acceptance criteria:**
- [ ] `docs/adr/0001-monorepo-and-tooling.md` covers pnpm, Turborepo, TypeScript
      strict, Node and pnpm pins, and the no-remote-cache decision.
- [ ] `docs/adr/0002-tailwind-v4-and-tokens.md` covers CSS-first config, the tokens
      package as the only hex source, the radius scale, and the contrast gate.
- [ ] `0003-coral-darkened-palette.md` records the choice, the contrast figures, and
      the rejected rose and original coral options.
- [ ] Each ADR has status, date, context, decision, consequences, and alternatives.
- [ ] `docs/adr/README.md` indexes all six ADRs, including the three still pending.

**Verification:**
- [ ] Every ADR renders and is linked from the index.
- [ ] Manual: a reader can tell what was rejected and why.

**Depends on:** F-10

**Files likely touched:**
- `docs/adr/0001-monorepo-and-tooling.md`, `docs/adr/0002-tailwind-v4-and-tokens.md`,
  `docs/adr/0003-coral-darkened-palette.md`, `docs/adr/README.md`

**Size:** S

---

## F-28: ADRs 0004 to 0006

**Description:** Record the three decisions that constrain later modules: Better Auth
with its fallback, Vercel plus managed services, and FSRS. Each one is a decision the
next module would otherwise relitigate.

**Acceptance criteria:**
- [ ] `0004-better-auth.md` covers passkey first with email OTP, no passwords, the
      Drizzle adapter, and the Clerk fallback with its trigger condition.
- [ ] `0005-vercel-and-managed-services.md` covers hosting, regions, the Terraform
      deferral, and what would force a move.
- [ ] `0006-fsrs-scheduler.md` covers `ts-fsrs`, recomputation from append-only review
      logs, and why SM-2 was dropped.
- [ ] All six ADRs are linked from `docs/adr/README.md` and from the README.

**Verification:**
- [ ] Index lists six ADRs, all links resolve.
- [ ] Manual: confirm no ADR contradicts `SPEC.md` section 9.

**Depends on:** F-22

**Files likely touched:**
- `docs/adr/0004-better-auth.md`, `docs/adr/0005-vercel-and-managed-services.md`,
  `docs/adr/0006-fsrs-scheduler.md`, `docs/adr/README.md`

**Size:** S

---

## F-29: README and clean clone

**Description:** Write the README a stranger can follow, then prove it by cloning into
a fresh folder and timing the path to a running harness page. Ten steps or less, and
the clock is the acceptance test.

**Acceptance criteria:**
- [ ] README covers prerequisites, install, infra, migrate, dev, verify, and the
      command table. Ten steps or fewer to a running page.
- [ ] Troubleshooting covers Windows and WSL2, Docker not running, and port conflicts.
- [ ] Links to the six ADRs, the threat model, the ASVS checklist, and the evidence doc.
- [ ] A clean clone into a new folder, with Docker already running, reaches the
      harness page in 10 minutes or less. Time, machine, and Docker version recorded.
- [ ] `pnpm verify:full` passes in that clone.

**Verification:**
- [ ] Follow the README literally, without prior knowledge, and record the elapsed time.
- [ ] Record the result in `docs/foundation-evidence.md`.

**Depends on:** F-28

**Files likely touched:**
- `README.md`, `docs/foundation-evidence.md`

**Size:** S

---

## F-30: Red drill and sign-off

**Description:** Prove the gates are real by breaking each one on purpose, then close
the module with evidence for all 18 acceptance criteria. A gate nobody has seen fail
is a gate nobody should trust.

**Acceptance criteria:**
- [ ] Drill 1: add a `process.env.UNLISTED` read. `pnpm env:check` fails and names it.
- [ ] Drill 2: push `--accent` below 4.5:1. `pnpm tokens:contrast` fails.
- [ ] Drill 3: remove one key from `messages/en.json`. `pnpm i18n:check` fails.
- [ ] Drill 4: add an image without alt text to one story. `pnpm storybook:test` fails.
- [ ] All four are reverted and `pnpm verify:full` is green.
- [ ] `docs/foundation-evidence.md` has a row per acceptance criterion with a link,
      a number, or a transcript.
- [ ] Acceptance checklist in `SPEC-foundation.md` and `tasks/plan.md` is updated.

**Verification:**
- [ ] Each drill output is captured before reverting.
- [ ] `pnpm verify:full` green on the final commit.
- [ ] Human sign-off recorded with date. No v1.1 or v2 work starts before it.

**Depends on:** F-29

**Files likely touched:**
- `docs/foundation-evidence.md`, `tasks/todo.md`, `tasks/plan.md`

**Size:** S

---

## Checkpoint: Phase 6, exit

- [ ] Threat model, ASVS checklist, and six ADRs exist and are linked from the README.
- [ ] A clean clone reaches running in 10 minutes or less, timed and recorded.
- [ ] All four red drills failed as intended and were reverted.
- [ ] All 18 acceptance criteria have evidence.
- [ ] Human sign-off recorded.
- [ ] The foundation module is closed. Planning for `data` may begin.

---

# Traceability: acceptance criterion to task

| # | Criterion, from `SPEC-foundation.md` section 5 | Proven by |
|---|---|---|
| 1 | Clean clone to harness page in 10 minutes or less, README 10 steps | F-29 |
| 2 | `pnpm verify` passes on a clean clone, CI runs it plus a11y and E2E | F-05, F-22 |
| 3 | CI fails on an unlisted `process.env` read and names it | F-07, F-30 |
| 4 | `.env.example` holds names only, nothing secret-shaped | F-07 |
| 5 | A missing required variable fails with a readable message | F-07 |
| 6 | `pnpm tokens:contrast` fails below 4.5:1 or 3:1, locked palette passes | F-10, F-30 |
| 7 | Dark preference paints dark before hydration, no flash | F-11 |
| 8 | `/` redirects from `Accept-Language` and the choice persists | F-18 |
| 9 | `pnpm i18n:check` fails on a one-sided key, no hardcoded component copy | F-13 to F-19, F-30 |
| 10 | Health returns 200, no auth, `no-store` | F-09 |
| 11 | Unknown route returns problem+json with `code` and `requestId` | F-08, F-09 |
| 12 | 14 components, four variants each, axe clean, no default shadcn state | F-12 to F-17 |
| 13 | `build-storybook` succeeds, `storybook:test` green | F-12, F-22 |
| 14 | Sentry test event with environment and release, no PII | F-24 |
| 15 | Threat model covers six surfaces, ASVS checklist has an owner per item | F-25, F-26 |
| 16 | Six ADRs exist and are linked from the README | F-27, F-28, F-29 |
| 17 | A pull request gets a preview URL serving the harness and health route | F-23 |
| 18 | Harness route JS is 200 kB gzipped or less, no GSAP in the app shell | F-03, F-11, F-22 |

---

# How to run this list

1. Work one card at a time, top to bottom. The only legal reorderings are the three
   noted in `tasks/plan.md`: F-04 around F-03, F-07/F-08/F-10 in any order, and
   docs drafted while waiting on CI or accounts.
2. Tick the acceptance criteria as they pass, not when the code is written.
3. Stop at each checkpoint for review. Do not start the next phase early.
4. If a card turns out to touch more than five files, split it and add the new card
   here before continuing.
5. If a card needs something outside the spec, stop and write an ADR first.
