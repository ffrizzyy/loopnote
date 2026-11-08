import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  CONTRAST_PAIRS,
  contrastRatio,
  contrastReport,
  meetsContrast,
  relativeLuminance,
} from "./contrast";
import { radii, renderTokensCss } from "./tokens";

/**
 * Every measured ratio, pinned to three decimals. The key is
 * `theme:foreground:background`. A token edit that changes any ratio fails here,
 * and adding a pair without a pin fails the coverage check below.
 */
const MEASURED: Record<string, string> = {
  "light:text:bg": "16.826",
  "light:text:surface": "17.591",
  "light:text2:bg": "8.244",
  "light:text2:surface": "8.619",
  "light:text3:bg": "5.189",
  "light:text3:surface": "5.425",
  "light:accent:bg": "5.232",
  "light:accent:surface": "5.470",
  "light:accentHover:bg": "6.340",
  "light:accentFg:accent": "5.383",
  "light:accentFg:accentHover": "6.524",
  "light:accentSoftFg:accentSoft": "7.110",
  "light:success:bg": "4.895",
  "light:success:surface": "5.117",
  "light:warning:bg": "4.658",
  "light:warning:surface": "4.870",
  "light:danger:bg": "6.649",
  "light:danger:surface": "6.951",
  "light:text:accentSoft": "15.413",
  "light:accent:accentSoft": "4.793",
  "dark:text:bg": "16.256",
  "dark:text:surface": "15.108",
  "dark:text2:bg": "9.628",
  "dark:text2:surface": "8.948",
  "dark:text3:bg": "6.146",
  "dark:text3:surface": "5.712",
  "dark:accent:bg": "6.908",
  "dark:accent:surface": "6.420",
  "dark:accentHover:bg": "8.296",
  "dark:accentFg:accent": "6.603",
  "dark:accentFg:accentHover": "7.930",
  "dark:accentSoftFg:accentSoft": "7.616",
  "dark:success:bg": "8.743",
  "dark:success:surface": "8.125",
  "dark:warning:bg": "9.311",
  "dark:warning:surface": "8.653",
  "dark:danger:bg": "7.988",
  "dark:danger:surface": "7.424",
  "dark:text:accentSoft": "12.823",
  "dark:accent:accentSoft": "5.449",
};

describe("WCAG contrast", () => {
  it("matches the reference extremes", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("rejects a malformed colour", () => {
    expect(() => relativeLuminance("#FFF")).toThrow(/invalid hex colour/);
  });

  it("applies body, large, and UI thresholds", () => {
    expect(meetsContrast(4.499, "body")).toBe(false);
    expect(meetsContrast(4.5, "body")).toBe(true);
    expect(meetsContrast(2.999, "large")).toBe(false);
    expect(meetsContrast(3, "large")).toBe(true);
    expect(meetsContrast(3, "ui")).toBe(true);
  });
});

describe("locked palette", () => {
  it("pins every measured ratio", () => {
    for (const row of contrastReport()) {
      const key = `${row.theme}:${row.foreground}:${row.background}`;
      // eslint-disable-next-line security/detect-object-injection -- key is built from typed rows
      const expected = MEASURED[key];

      expect(row.ratio.toFixed(3), key).toBe(expected);
    }
  });

  it("has a pin for every defined pair and no stale pins", () => {
    const keys = contrastReport().map(
      (row) => `${row.theme}:${row.foreground}:${row.background}`,
    );

    expect(keys).toHaveLength(CONTRAST_PAIRS.length * 2);
    expect(new Set(keys)).toEqual(new Set(Object.keys(MEASURED)));
  });

  it("passes every defined pair", () => {
    expect(contrastReport().filter((row) => !row.pass)).toEqual([]);
  });

  it("keeps the radius scale", () => {
    expect(Object.values(radii)).toEqual(["6px", "10px", "16px", "20px", "9999px"]);
  });

  it("keeps tokens.css in sync with the table", () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path beside the test
    const file = readFileSync(new URL("./tokens.css", import.meta.url), "utf8").replace(
      /\r\n/g,
      "\n",
    );

    expect(file).toBe(renderTokensCss());
  });
});
