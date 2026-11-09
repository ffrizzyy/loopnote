import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import { THEME_COOKIE, themeScript } from "./theme";

/**
 * Runs the exact inline source that ships in the document, with a fake document
 * and window. The Playwright suite proves the browser result; this proves the
 * ordering rules without a browser.
 */
function resolveTheme(cookie: string, prefersDark: boolean): string | undefined {
  const attributes = new Map<string, string>();

  runInNewContext(themeScript, {
    document: {
      cookie,
      documentElement: {
        setAttribute: (name: string, value: string) => attributes.set(name, value),
      },
    },
    window: {
      matchMedia: () => ({ matches: prefersDark }),
    },
  });

  return attributes.get("data-theme");
}

describe("theme script", () => {
  it("uses the cookie before the system preference", () => {
    expect(resolveTheme(`${THEME_COOKIE}=dark`, false)).toBe("dark");
    expect(resolveTheme(`${THEME_COOKIE}=light`, true)).toBe("light");
  });

  it("follows the system preference without a cookie", () => {
    expect(resolveTheme("", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
  });

  it("ignores an unknown cookie value and falls back to the system", () => {
    expect(resolveTheme(`${THEME_COOKIE}=sepia`, true)).toBe("dark");
    expect(resolveTheme(`${THEME_COOKIE}=sepia`, false)).toBe("light");
  });

  it("falls back to light when reading storage throws", () => {
    const attributes = new Map<string, string>();

    runInNewContext(themeScript, {
      document: {
        get cookie(): string {
          throw new Error("cookies are blocked");
        },
        documentElement: {
          setAttribute: (name: string, value: string) => attributes.set(name, value),
        },
      },
      window: {
        matchMedia: () => ({ matches: true }),
      },
    });

    expect(attributes.get("data-theme")).toBe("light");
  });
});
