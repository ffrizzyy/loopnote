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

**This misses the 150 kB budget in criterion 18.** The framework floor on its own is
170.4 kB, before a single component, font, or product line exists. No application
code is in the bundle, so this is a floor rather than a regression, and trimming it
would mean dropping the App Router or the polyfill chunk.

Proposal, pending approval: raise the harness-route budget to 200 kB gzipped and keep
`SPEC.md` section 1.4's separate landing-page LCP, INP, and CLS budgets unchanged.
Recorded here rather than edited into the spec, because the spec threshold is approved.

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
