# Stack compatibility spike

F-06, 2026-11-01. One day timebox, run before any of these tools enter the product.
The goal was a single answer per item: can it ship together, and if not, what does one
person switch to.

The spike ran on a throwaway local branch, `spike/stack-compatibility`, as a standalone
pnpm workspace in `spikes/stack-compatibility`. Nothing from that directory is merged.
This note and the pins below are the only output. The branch is deleted after the note
lands on `main`.

## Verdicts

| Item | Pinned version | Verdict | Fallback if it breaks |
|---|---|---|---|
| Node | 24.21.0 | Go | Node 22 LTS: set `engines` to `>=22 <23`, add `.nvmrc` with `22`, reinstall |
| pnpm | 12.11.2 | Go, with build approvals | pnpm 10: remove `allowBuilds`, use `onlyBuiltDependencies` |
| TypeScript | 6.0.3 | Go | 5.9.x, which costs the TS 7 deprecation cleanup only |
| Next.js | 16.4.3 | Go | No fallback. Next 16 is the framework of record and the app already runs on it |
| React | 19.3.1 | Go | No fallback. Required by Next 16 |
| Tailwind CSS | 4.3.3 | Go | Tailwind 3.4 with a JS config, at the cost of rewriting `@theme` tokens |
| `@tailwindcss/postcss` | 4.3.3 | Go | None needed |
| shadcn CLI | 4.23.0 | Go, with two caveats below | Copy components by hand from the registry, which is what the CLI does anyway |
| Storybook | 10.6.5 | Go | `@storybook/react-vite` 10.6.5 with a manual `@` alias, losing Next's static asset handling |
| `@storybook/nextjs-vite` | 10.6.5 | Go | Same as above |
| Vite (transitive) | 8.3.5 | Go | Storybook accepts Vite 5 to 8 |
| Rolldown (transitive) | 1.2.16 | Go, with a warning | Pin Vite 7 if the directive warning becomes a real bug |
| `next-intl` | 4.14.9 | Go | Load messages manually in each server component, losing the plugin and typed navigation |
| `@storybook/addon-a11y` | 10.6.5 | Go | Keep axe in the Playwright suite instead |
| `@storybook/addon-docs` | 10.6.5 | Go | Drop it, stories still build |
| `class-variance-authority` | 0.7.1 | Go | Plain objects with conditional `clsx` |
| `clsx` | 2.1.1 | Go | Template strings |
| `tailwind-merge` | 3.7.0 | Go | Drop it, accept occasional class conflicts |
| `lucide-react` | 1.66.0 | Installed, not exercised | Inline the handful of icons actually used |
| `cn` | 0.5.1 | Ship with care, see caveat 1 | Use a local `cn` helper in `@/lib/utils` and rewrite the import |
| `radix-ui` | 1.8.1 | Ship with care, see caveat 1 | Import from `@radix-ui/react-*` packages directly |

## What was actually run

1. `pnpm install` in the spike workspace. Clean after adding `allowBuilds` for
   `@parcel/watcher`, `@swc/core`, and `esbuild`. pnpm 12 fails the install without
   those entries, the same behaviour the root workspace already documents.
2. `pnpm exec shadcn add badge --yes --overwrite`. Created
   `src/components/ui/badge.tsx` and installed its dependencies. Exit 0.
3. `pnpm build`. Next 16 production build. `/id` and `/en` both prerendered as SSG,
   proxy compiled, TypeScript finished clean.
4. `pnpm build-storybook`. Storybook 10 production build, exit 0. Two non-fatal
   Vite warnings about module level directives, explained in caveat 2.
5. Static build served on port 6007, story loaded in Chromium through Playwright.
   Story `spike-savebutton--default` rendered the label `Save note` from
   `messages/en.json`, computed background `rgb(185, 58, 65)`, which is `#B93A41`
   from the palette, and a 6 pixel top left radius from the `--radius-control` token.
   Zero console errors and zero page errors.
6. Next production server on port 3200. `GET /` returned 307 to `/id`, `/id` returned
   200 with the Indonesian heading, `/en` returned 200 with the English heading.

Screenshot: `docs/spikes/stack-compatibility-storybook.png`. It shows the tokenised
button inside the Storybook iframe, which is the render the card asks for.

## Caveats worth carrying into the build

1. **The shadcn CLI does not emit the code shape the docs show.** Version 4.23.0 wrote
   `import { cn } from "cn"` and `import { Slot } from "radix-ui"`, and added
   `cn@^0.5.1` and `radix-ui@^1.8.1` to `dependencies` with caret ranges. Two
   consequences. First, every `shadcn add` needs a follow up pin, because the rest of
   the repo pins exact versions. Second, generated components reference tokens such as
   `bg-primary`, `border-border`, and `ring-ring`, which palette B does not define.
   Map those names in `@theme` when F-11 lands, or the components render unstyled.
2. **Storybook does not preserve Next client boundaries.** Rolldown warns that the
   `"use client"` directive on bundled Next internals may not survive. The practical
   effect: a component that needs a React context has to get that provider from
   `.storybook/preview.tsx`, and a hooks rule violation will not stop a story from
   building. Storybook is a render check, not a substitute for the app build or the
   end to end suite. The spike's `SaveButton` gets `NextIntlClientProvider` from the
   preview decorator for this reason.
3. **Next rewrites the spike `tsconfig.json` on first build**, adding `allowJs`,
   `jsx: react-jsx`, and `.next/dev/types/**/*.ts`. The product tsconfig already sets
   `jsx: preserve` for Next, so this is expected and not a conflict.
4. **Storage of the story id.** Storybook derives `Spike/SaveButton` into
   `spike-savebutton--default`. Changing a story title breaks any screenshot link in
   CI, so screenshot targets should be treated as URLs and kept stable.

## Pins to apply when each tool lands

The root `package.json` is not changed by this card, because none of these packages is
used yet. When the owning task arrives, use exactly:

- F-11: `tailwindcss@4.3.3`, `@tailwindcss/postcss@4.3.3`
- F-12: `storybook@10.6.5`, `@storybook/nextjs-vite@10.6.5`,
  `@storybook/react@10.6.5`, `@storybook/addon-a11y@10.6.5`,
  `@storybook/addon-docs@10.6.5`
- F-18: `next-intl@4.14.9`
- Component work: `class-variance-authority@0.7.1`, `clsx@2.1.1`,
  `tailwind-merge@3.7.0`, `lucide-react@1.66.0`

Node stays at 24.21.0 and pnpm at 12.11.2. TypeScript stays at 6.0.3, see
`docs/spikes/toolchain-baseline.md` for why 7.0.2 was rejected.
