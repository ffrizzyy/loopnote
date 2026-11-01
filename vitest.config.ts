import { defineConfig } from "vitest/config";

export default defineConfig({
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
