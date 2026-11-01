import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import { TS_FILES, base } from "./base.js";

/**
 * react-hooks v7 ships flat configs; v5 and v6 shipped legacy objects.
 * Accept either shape.
 */
function hooksRules() {
  const recommended = reactHooks.configs?.recommended;
  if (Array.isArray(recommended)) {
    return Object.assign({}, ...recommended.map((entry) => entry.rules ?? {}));
  }
  return recommended?.rules ?? {};
}

/**
 * a11y rules fail the build, they do not warn. A skipped alt attribute is a
 * defect, not a style preference.
 */
function a11yRules() {
  return jsxA11y.flatConfigs?.recommended?.rules ?? {};
}

/**
 * Applies the browser environment, the a11y rules, and the hooks rules to a
 * given set of files. The root config calls this only for React directories, so
 * a server file never gets browser globals.
 */
export function reactFiles(files = TS_FILES) {
  return {
    files,
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
    },
    rules: {
      ...a11yRules(),
      ...hooksRules(),
    },
  };
}

export const react = tseslint.config(...base, reactFiles());
