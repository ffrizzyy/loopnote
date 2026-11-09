import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  renderTailwindThemeCss,
  tailwindTheme,
  type TailwindColorName,
} from "./tailwind.js";

/**
 * The palette variables from `@loopnote/tokens`. Duplicated on purpose: adding a
 * token without mapping it in the Tailwind theme fails here, and this list is the
 * contract the theme is written against.
 */
const PALETTE_VARIABLES = [
  "--bg",
  "--surface",
  "--surface-2",
  "--border",
  "--border-strong",
  "--text",
  "--text-2",
  "--text-3",
  "--accent",
  "--accent-hover",
  "--accent-fg",
  "--accent-soft",
  "--accent-soft-fg",
  "--success",
  "--warning",
  "--danger",
] as const;

const SHADCN_NAMES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
] as const satisfies readonly TailwindColorName[];

const RAW_HEX = /#[0-9a-f]{3,8}\b/i;
// Tailwind arbitrary spacing, for example p-[13px] or gap-[0.4rem]. Screens use
// the default scale; a one-off value belongs in a component token or the theme.
const ARBITRARY_SPACING = /\b(?:[pm][trblxy]?|gap|space-[xy])-\[[^\]]+\]/;

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const BUILD_DIRECTORIES = new Set([
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "storybook-static",
  "test-results",
]);

describe("tailwind theme", () => {
  it("maps every palette variable", () => {
    const values = Object.values(tailwindTheme.colors).join(" ");

    for (const variable of PALETTE_VARIABLES) {
      expect(values, variable).toContain(`var(${variable})`);
    }
  });

  it("keeps the shadcn names without stealing accent", () => {
    for (const name of SHADCN_NAMES) {
      // eslint-disable-next-line security/detect-object-injection -- name is a TailwindColorName
      expect(tailwindTheme.colors[name], name).toMatch(/^var\(--/);
    }

    expect(tailwindTheme.colors.primary).toBe("var(--accent)");
    expect(tailwindTheme.colors["primary-foreground"]).toBe("var(--accent-fg)");
    expect(tailwindTheme.colors.accent).toBe("var(--accent-soft)");
    expect(tailwindTheme.colors["accent-foreground"]).toBe("var(--accent-soft-fg)");
    expect(tailwindTheme.colors.background).toBe("var(--bg)");
    expect(tailwindTheme.colors.foreground).toBe("var(--text)");
    expect(tailwindTheme.colors.card).toBe("var(--surface)");
    expect(tailwindTheme.colors.muted).toBe("var(--surface-2)");
    expect(tailwindTheme.colors.border).toBe("var(--border)");
    expect(tailwindTheme.colors.input).toBe("var(--border-strong)");
    expect(tailwindTheme.colors.ring).toBe("var(--accent)");
    expect(tailwindTheme.colors.destructive).toBe("var(--danger)");
  });

  it("defines the radius scale as utilities", () => {
    expect(tailwindTheme.radius).toEqual({
      sm: "var(--r-sm)",
      md: "var(--r-md)",
      lg: "var(--r-lg)",
      xl: "var(--r-xl)",
      full: "var(--r-full)",
    });
  });

  it("uses Geist for both families with a local fallback stack", () => {
    expect(tailwindTheme.font.sans).toContain("var(--font-geist-sans)");
    expect(tailwindTheme.font.mono).toContain("var(--font-geist-mono)");
    expect(tailwindTheme.font.sans).toContain("ui-sans-serif");
    expect(tailwindTheme.font.mono).toContain("ui-monospace");
  });

  it("keeps tailwind.css in sync with the table", () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path beside the source
    const file = readFileSync(
      fileURLToPath(new URL("./tailwind.css", import.meta.url)),
      "utf8",
    ).replace(/\r\n/g, "\n");

    expect(file).toBe(renderTailwindThemeCss());
  });

  it("keeps the app pointing at the shared preset", () => {
    const appCss = read(join(REPO_ROOT, "apps/web/src/app/globals.css"));

    expect(appCss).toContain('@import "@loopnote/config/tailwind.css"');
    expect(appCss).not.toContain("@theme");
    expect(appCss).not.toContain("--color-");
  });
});

describe("source guard", () => {
  it("keeps raw hex inside packages/tokens", () => {
    const offenders = sourceFiles()
      .filter((file) => RAW_HEX.test(read(file)))
      .map((file) => file.replace(process.cwd(), ""));

    expect(offenders).toEqual([]);
  });

  it("uses the spacing scale instead of arbitrary values", () => {
    const offenders = sourceFiles()
      .filter((file) => file.endsWith(".tsx"))
      .filter((file) => ARBITRARY_SPACING.test(read(file)))
      .map((file) => file.replace(process.cwd(), ""));

    expect(offenders).toEqual([]);
  });

  it("finds the app sources it is supposed to guard", () => {
    expect(sourceFiles().length).toBeGreaterThan(0);
  });
});

function sourceFiles(): string[] {
  return [join(REPO_ROOT, "apps"), join(REPO_ROOT, "packages")].flatMap((root) =>
    walk(root).filter((file) => !isTokenSource(file)),
  );
}

function isTokenSource(path: string): boolean {
  return path.replace(/\\/g, "/").includes("/packages/tokens/");
}

function walk(directory: string): string[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- roots are fixed repository paths
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return BUILD_DIRECTORIES.has(entry.name) ? [] : walk(path);
    }
    if (!/\.(?:ts|tsx|css)$/.test(entry.name)) return [];
    if (/(?:\.test|\.spec)\.(?:ts|tsx)$|\.d\.ts$/.test(entry.name)) return [];

    return [path];
  });
}

function read(path: string): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- paths come from walk()
  return readFileSync(path, "utf8");
}
