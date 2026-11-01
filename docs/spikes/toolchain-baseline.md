# Toolchain baseline

Recorded during F-01 on 2026-11-01, on the Windows development machine.
This is a facts file. The decision record is `docs/adr/0001-monorepo-and-tooling.md`,
written in F-27, which cites this file.

## Host

| Thing | Value |
|---|---|
| Node | 24.21.0, Active LTS |
| pnpm | 12.11.2, with 12.16.1 available |
| npm | used only to query the registry |
| Docker | 29.8.0, build 88096ef |
| OS | Windows, Docker Desktop with WSL2 |

## Pins resolved

| Package | Pin | Note |
|---|---|---|
| `next` | 16.4.3 | requires Node `>=20.9.0` |
| `react`, `react-dom` | 19.3.1 | |
| `typescript` | 6.0.3 | see constraint 1 |
| `eslint` | 9.39.x | see constraint 2 |
| `turbo` | 2.11.10 | `turbo.json` uses `tasks`, not `pipeline` |
| `tailwindcss` | 4.3.3 | with `@tailwindcss/postcss` 4.3.3 |
| `storybook` | 10.6.5 | `@storybook/nextjs` 10.6.5 supports Next 16 |
| `hono` | 4.13.x | |
| `next-intl` | 4.14.x | peer allows Next 16 |
| `drizzle-orm` | 0.45.x | |
| `zod` | 4.6.x | v4 API, not v3 |
| `vitest` | 5.0.5 | requires Node `^22.12`, `^24`, or `>=26` |
| `@playwright/test` | 1.64.x | |
| `@sentry/nextjs` | 11.10.x | |
| `better-auth` | 1.7.x | |

## Two constraints the plan did not expect

1. **TypeScript 7.0.2 is latest, but is not usable yet.** `typescript-eslint`
   8.72.1 declares `typescript >=4.8.4 <6.1.0`. Pinning TypeScript 7 would drop
   type-aware linting across the repo. Resolution: pin 6.0.3, the newest release
   inside the supported range. Revisit when `typescript-eslint` widens the range.

2. **ESLint 10.14.0 is latest, but is not usable with the a11y plugin.**
   `eslint-plugin-jsx-a11y` 6.10.2 declares `eslint ^3` through `^9`. The spec
   requires jsx-a11y, so resolution is ESLint 9.39.x. Revisit when the plugin
   publishes a 10.x peer range.

Neither constraint changes the spec. Both are version choices, recorded here so
F-27 can cite them and F-06 can re-check them.

## Deviation from the written plan

`tasks/plan.md` assumed pnpm 10. The machine has 12.11.2, and pnpm 12 keeps the
workspace file format and the `packageManager` pin. Resolution: pin 12.11.2 rather
than installing a second package manager.

## Verified at F-01

- `pnpm install` resolves all 9 workspace projects, root included.
- `turbo ls` lists all 8 workspace packages.
- `turbo --version` prints 2.11.10.
- No workspace package has build or test scripts yet. Those land in F-02 to F-05.
