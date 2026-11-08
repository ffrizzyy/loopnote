import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Point tests at the source so a clean clone can run `pnpm test` before any
    // package build has produced dist.
    alias: {
      "@loopnote/config/env": fileURLToPath(
        new URL("./packages/config/src/env.ts", import.meta.url),
      ),
      "@loopnote/schemas": fileURLToPath(
        new URL("./packages/schemas/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["{apps,packages}/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Only .ts for now. Uncovered .tsx files fail the v8 remapper's parser before
      // any component has a test; .tsx joins the include list with the component
      // tests in F-13, where the files are transformed by the test itself.
      include: ["{apps,packages}/*/src/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/dist/**",
        "**/.next/**",
        "**/*.d.ts",
        "**/index.ts",
        // The Next route entry is a one-line adapter export. The integration
        // suite owns it, and the Hono app inside it is unit tested.
        "**/src/app/**",
      ],
      // The bar from SPEC.md section 6. Auth, billing, and the scheduler carry a 90
      // percent bar. Those paths are declared now and match nothing, so the config
      // is ready before the code lands rather than after somebody forgets.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        "**/src/**/auth/**": { lines: 90, functions: 90, branches: 90, statements: 90 },
        "**/src/**/billing/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
        "**/src/**/scheduler/**": {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
});
