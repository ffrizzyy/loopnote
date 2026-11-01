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
