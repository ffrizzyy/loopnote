import { base } from "@loopnote/config/eslint/base";
import { reactFiles } from "@loopnote/config/eslint/react";

/**
 * One config for the whole repo. ESLint runs once from the root instead of once
 * per package, which keeps a single process and a single report.
 *
 * React rules are scoped to the two React trees. A server file must not get
 * browser globals, and a hooks rule must not fire on a worker.
 */
export default [
  ...base,
  reactFiles(["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"]),
];
