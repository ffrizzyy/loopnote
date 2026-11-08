import { color, cssColorVariables, type ColorToken, type ThemeName } from "./tokens";

/* eslint-disable security/detect-object-injection -- indices are ColorToken values from a closed union */

export type ContrastUse = "body" | "large" | "ui";

/** WCAG 2.2: 4.5:1 for body text, 3:1 for large text and UI boundaries. */
export const CONTRAST_THRESHOLDS = {
  body: 4.5,
  large: 3,
  ui: 3,
} as const;

export interface ContrastPair {
  readonly foreground: ColorToken;
  readonly background: ColorToken;
  readonly use: ContrastUse;
}

/**
 * Every pair a component may render. `text3` was caption-only until measured;
 * it clears 4.5:1 in both themes, so it is now held to the body threshold.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: "text", background: "bg", use: "body" },
  { foreground: "text", background: "surface", use: "body" },
  { foreground: "text2", background: "bg", use: "body" },
  { foreground: "text2", background: "surface", use: "body" },
  { foreground: "text3", background: "bg", use: "body" },
  { foreground: "text3", background: "surface", use: "body" },
  { foreground: "accent", background: "bg", use: "body" },
  { foreground: "accent", background: "surface", use: "body" },
  { foreground: "accentHover", background: "bg", use: "body" },
  { foreground: "accentFg", background: "accent", use: "body" },
  { foreground: "accentFg", background: "accentHover", use: "body" },
  { foreground: "accentSoftFg", background: "accentSoft", use: "body" },
  { foreground: "success", background: "bg", use: "body" },
  { foreground: "success", background: "surface", use: "body" },
  { foreground: "warning", background: "bg", use: "body" },
  { foreground: "warning", background: "surface", use: "body" },
  { foreground: "danger", background: "bg", use: "body" },
  { foreground: "danger", background: "surface", use: "body" },
  { foreground: "text", background: "accentSoft", use: "body" },
  { foreground: "accent", background: "accentSoft", use: "body" },
];

const HEX = /^#([0-9a-f]{6})$/i;

function channels(hex: string): [number, number, number] {
  const match = HEX.exec(hex);

  if (match === null || match[1] === undefined) {
    throw new Error(`invalid hex colour: ${hex}`);
  }

  const value = Number.parseInt(match[1], 16);

  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function linear(value: number): number {
  const channel = value / 255;

  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 for black and 1 for white. */
export function relativeLuminance(hex: string): number {
  const [red, green, blue] = channels(hex);

  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** Ratio between the lighter and darker colour, from 1 to 21. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

export function requiredContrast(use: ContrastUse): number {
  return CONTRAST_THRESHOLDS[use];
}

export function meetsContrast(ratio: number, use: ContrastUse): boolean {
  return ratio >= requiredContrast(use);
}

export interface ContrastRow {
  readonly theme: ThemeName;
  readonly foreground: ColorToken;
  readonly background: ColorToken;
  readonly fgVariable: string;
  readonly bgVariable: string;
  readonly ratio: number;
  readonly threshold: number;
  readonly pass: boolean;
}

const THEMES: readonly ThemeName[] = ["light", "dark"];

export function contrastReport(): ContrastRow[] {
  return THEMES.flatMap((theme) =>
    CONTRAST_PAIRS.map((pair) => {
      const ratio = contrastRatio(
        color(theme, pair.foreground),
        color(theme, pair.background),
      );

      return {
        theme,
        foreground: pair.foreground,
        background: pair.background,
        fgVariable: cssColorVariables[pair.foreground],
        bgVariable: cssColorVariables[pair.background],
        ratio,
        threshold: requiredContrast(pair.use),
        pass: meetsContrast(ratio, pair.use),
      };
    }),
  );
}
