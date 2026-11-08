# Foundation evidence

Running record for the 18 acceptance criteria in `SPEC-foundation.md`. F-29 times the
clean clone and F-30 closes the list. A row is added as each task lands, not at the
end from memory.

## Measurements

### First-load JavaScript, harness route

F-03, 2026-11-01. Production build, Next.js 16.4.3, React 19.3.1, zero application
JavaScript. Measured from the six chunks the served HTML actually references, gzipped
with .NET `CompressionLevel.Optimal`.

| Chunk | Raw bytes | Gzipped |
|---|---|---|
| `3re6pi1_86_x2.js` | 185,442 | 49,594 |
| `3bpxablmlbods.js` | 229,814 | 71,953 |
| `0cz1d0mv5g_q7.js` | 112,594 | 39,473 |
| `19ste6fcvwx48.js` | 16,980 | 5,972 |
| `turbopack-3-ry682tkyiqk.js` | 10,030 | 3,945 |
| `2smvhoyqrx66l.js` | 13,825 | 3,526 |
| **Total** | **568,685** | **170,463 (170.4 kB)** |

**This missed the original 150 kB budget in criterion 18.** The framework floor on its
own is 170.4 kB, before a single component, font, or product line exists. No
application code is in the bundle, so this is a floor rather than a regression, and
trimming it would mean dropping the App Router or the polyfill chunk.

Decision, approved 2026-11-08: criterion 18 is now 200 kB gzipped, recorded in
`SPEC-foundation.md`. That leaves roughly 30 kB of headroom for real components before
the next review. `SPEC.md` section 1.4's separate landing-page LCP, INP, and CLS
budgets are unchanged.

### Test harness

F-05, 2026-11-01. Vitest 5.0.5 with v8 coverage, Playwright 1.64.1 on Chrome for
Testing 156.

- Unit tests: 4 in `apps/worker`, all passing.
- `shutdown.ts`: 92.59 percent statements (25/27), 75 percent branches (9/12), 100
  percent functions and lines.
- Threshold gate: an untested source file pulled the run to 78.12 percent statements
  and 56.25 percent branches. The command exited 1 and named both failed thresholds.
  Removing a test case was tried first and changed nothing, because the other tests
  already covered the same lines.
- End to end: 2 tests against a production build on port 3100, both passing. The
  server-rendered h1 is asserted by role, and the console error check collects every
  error message from load to network idle.

### Clean clone, Phase 1 checkpoint

2026-11-08, commit `86beec4`. Cloned `https://github.com/ffrizzyy/loopnote.git` into an
empty temporary directory.

| Step | Result |
|---|---|
| `git clone` | commit `86beec4` |
| `pnpm install` | clean, 3 minutes 5 seconds, pnpm 12.11.2 |
| `pnpm verify` | exit 0, 4 tests passing |
| `pnpm e2e` | exit 0, 2 tests passing |

`pnpm dev` was checked on the working copy rather than the clone: the harness route
returned 200 with the expected h1, and the worker logged `worker.started` followed by
the 30 second heartbeat. A full install time target is measured separately in F-29.

### Env contract

F-07, 2026-11-08. Two gates, both proven by breaking them.

- Lint and `pnpm env:check` on a deliberate `process.env.UNLISTED_SECRET` read:
  - lint: `no-restricted-properties`, `'process.env' is restricted from being used`.
  - check: `env:check failed`, then
    `apps\worker\src\probe.ts:1 reads UNLISTED_SECRET, which .env.example does not list`,
    exit 1.
- Boot failure on the built worker with `NODE_ENV=production` and `DATABASE_URL`
  unset: stdout empty, stderr exactly `env: DATABASE_URL is missing or invalid`,
  exit 1, no stack trace.
- Heartbeat override on the built worker with `WORKER_HEARTBEAT_MS=1000`:
  `worker.started` reported `heartbeatMs: 1000`, followed by heartbeats at 1007 ms
  and 2011 ms. The value comes from the env module, not a constant.
- `pnpm test:coverage`: 96.55 percent statements, 88.88 percent branches, 100 percent
  functions and lines across 4 files and 19 tests.

### Error contract

F-08, 2026-11-08. One problem shape, one code registry, one helper.

- `ProblemSchema` parses the section 3.1 example and rejects unknown keys, a stack,
  an internal UUID in `detail`, an overlong detail, an unknown code, a UUIDv4
  `requestId`, a 2xx status, and any `type`, `title`, or `status` that disagrees with
  the code.
- The helper emitted 400, 404, 429, and 500 responses with exactly
  `content-type: application/problem+json`, `cache-control: no-store`, the six
  contract keys, and a fresh UUIDv7 `requestId` per response.
- Append-only drill: removing `note_not_found` from the registry failed
  `keeps every published code, status, and title` at
  `expected { …(6) } to have property "note_not_found"`. The entry was restored.
- `pnpm test:coverage`: 97.36 percent statements, 91.3 percent branches, 100 percent
  functions and lines across 6 files and 39 tests.

### API surface

F-09, 2026-11-08. Hono inside the Next route handler, with one exit for every error.

- `pnpm test:integration`: 4 tests against the exported route handler. Health is
  `200` with the package version and `no-store`; an unknown route under v1 and one
  outside v1 are both `404 application/problem+json`; a thrown sentinel error is
  `500 application/problem+json` and the body does not contain the sentinel message
  or a stack.
- Manual `curl -i` against `next start`:
  - `/api/v1/health`: `200`, `content-type: application/json`,
    `cache-control: no-store`, `{"status":"ok","version":"0.0.0"}`.
  - `/api/v1/nope` and `/api/v2/nope`: `404`,
    `content-type: application/problem+json`, `code: not_found`, UUIDv7 `requestId`.
- `next build` lists the route as dynamic: `ƒ /api/[[...route]]`.
- `pnpm verify:full`: 39 unit tests, 4 integration tests, and 2 e2e tests green.
