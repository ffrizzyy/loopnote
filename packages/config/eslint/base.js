import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import security from "eslint-plugin-security";
import globals from "globals";
import tseslint from "typescript-eslint";

export const TS_FILES = ["**/*.{ts,tsx,mts,cts}"];

/**
 * eslint-plugin-security ships a flat config in v4 and a legacy one before that.
 * Normalise both so this file keeps working across a patch bump.
 */
function securityRules() {
  const recommended = security.configs?.recommended;
  if (Array.isArray(recommended)) {
    return Object.assign({}, ...recommended.map((entry) => entry.rules ?? {}));
  }
  return recommended?.rules ?? {};
}

export const ignores = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/storybook-static/**",
  "**/coverage/**",
  "**/playwright-report/**",
  "**/test-results/**",
];

const ENV_MESSAGE =
  "Read environment variables through src/env.ts, never process.env directly.";

export const base = tseslint.config(
  { ignores },
  js.configs.recommended,
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"],
    ignores: ["**/src/env.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: ENV_MESSAGE,
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.value='env']",
          message: ENV_MESSAGE,
        },
      ],
    },
  },
  {
    files: TS_FILES,
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    plugins: {
      "import-x": importX,
      security,
    },
    rules: {
      // The TypeScript compiler owns these. The core rules cannot see types and
      // report false positives on DOM and ambient globals.
      "no-undef": "off",
      "no-unused-vars": "off",

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      eqeqeq: ["error", "smart"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-param-reassign": "error",

      ...securityRules(),
    },
  },
  {
    // CLI scripts walk the repository and print to the terminal by design. The
    // non-literal fs warning assumes an HTTP input, which cannot happen here.
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  prettier,
);
