/**
 * The locked palette from SPEC.md section 2.4. Every hex value in the product
 * comes from this table. A unit test compares tokens.css to renderTokensCss(),
 * and the contrast test pins each measured ratio.
 */
/* eslint-disable security/detect-object-injection -- every index is a ColorToken or RadiusToken from a closed union */

export type ThemeName = "light" | "dark";

export const colors = {
  bg: { light: "#F6F7F9", dark: "#0F1117" },
  surface: { light: "#FCFCFD", dark: "#161923" },
  surface2: { light: "#EEF0F4", dark: "#1D212C" },
  border: { light: "#E1E4EA", dark: "#2A2F3C" },
  borderStrong: { light: "#C9CED8", dark: "#3A4050" },
  text: { light: "#14161F", dark: "#ECEEF3" },
  text2: { light: "#444A5B", dark: "#B4B9C8" },
  text3: { light: "#626879", dark: "#8C93A6" },
  accent: { light: "#B93A41", dark: "#F0787D" },
  accentHover: { light: "#A33339", dark: "#F58F93" },
  accentFg: { light: "#FFF9F8", dark: "#14161F" },
  accentSoft: { light: "#FBE9EA", dark: "#3A2023" },
  accentSoftFg: { light: "#8E2A30", dark: "#F7A3A6" },
  success: { light: "#2B7A50", dark: "#5CC48C" },
  warning: { light: "#9A6412", dark: "#E0AE57" },
  danger: { light: "#A8232F", dark: "#F28B93" },
} as const satisfies Record<string, { readonly light: string; readonly dark: string }>;

export type ColorToken = keyof typeof colors;

const colorNames = Object.keys(colors) as ColorToken[];

export const cssColorVariables = {
  bg: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  border: "--border",
  borderStrong: "--border-strong",
  text: "--text",
  text2: "--text-2",
  text3: "--text-3",
  accent: "--accent",
  accentHover: "--accent-hover",
  accentFg: "--accent-fg",
  accentSoft: "--accent-soft",
  accentSoftFg: "--accent-soft-fg",
  success: "--success",
  warning: "--warning",
  danger: "--danger",
} as const satisfies Record<ColorToken, `--${string}`>;

export const radii = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "20px",
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radii;

const radiusNames = Object.keys(radii) as RadiusToken[];

export const cssRadiusVariables = {
  sm: "--r-sm",
  md: "--r-md",
  lg: "--r-lg",
  xl: "--r-xl",
  full: "--r-full",
} as const satisfies Record<RadiusToken, `--${string}`>;

export function color(theme: ThemeName, token: ColorToken): string {
  return colors[token][theme];
}

/** The exact contents of tokens.css. The file and this output must stay equal. */
export function renderTokensCss(): string {
  const light = colorNames
    .map(
      (token) => `  ${cssColorVariables[token]}: ${colors[token].light.toLowerCase()};`,
    )
    .join("\n");
  const dark = colorNames
    .map((token) => `  ${cssColorVariables[token]}: ${colors[token].dark.toLowerCase()};`)
    .join("\n");
  const radius = radiusNames
    .map((token) => `  ${cssRadiusVariables[token]}: ${radii[token]};`)
    .join("\n");

  return [
    "/* Colour and radius values. The test compares this file to renderTokensCss(). */",
    ":root {",
    light,
    "",
    radius,
    "}",
    "",
    '[data-theme="dark"] {',
    dark,
    "}",
    "",
  ].join("\n");
}
