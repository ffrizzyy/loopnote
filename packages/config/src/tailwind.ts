/**
 * The Tailwind v4 theme. Every colour points at a CSS variable from
 * `@loopnote/tokens`, so a utility and the runtime `[data-theme]` switch share one
 * value and no hex can appear in a component.
 *
 * The two exceptions are deliberate and come from the shadcn contract:
 * `primary` is the brand accent, while shadcn's `accent` is a subtle hover fill.
 * Mapping shadcn's `accent` to `--accent` would make every hover fill as loud as
 * the main action, so it points at `--accent-soft` instead.
 *
 * `renderTailwindThemeCss()` is the source of `tailwind.css`. The unit test
 * compares that file to this output, so the two cannot drift.
 */

export const tailwindTheme = {
  colors: {
    // Palette tokens, named after their variable.
    bg: "var(--bg)",
    surface: "var(--surface)",
    "surface-2": "var(--surface-2)",
    border: "var(--border)",
    "border-strong": "var(--border-strong)",
    text: "var(--text)",
    "text-2": "var(--text-2)",
    "text-3": "var(--text-3)",
    "accent-hover": "var(--accent-hover)",
    "accent-fg": "var(--accent-fg)",
    "accent-soft": "var(--accent-soft)",
    "accent-soft-fg": "var(--accent-soft-fg)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",

    // shadcn semantic names. `accent` is the subtle hover fill, not the brand.
    background: "var(--bg)",
    foreground: "var(--text)",
    card: "var(--surface)",
    "card-foreground": "var(--text)",
    popover: "var(--surface)",
    "popover-foreground": "var(--text)",
    primary: "var(--accent)",
    "primary-foreground": "var(--accent-fg)",
    secondary: "var(--surface-2)",
    "secondary-foreground": "var(--text)",
    muted: "var(--surface-2)",
    "muted-foreground": "var(--text-2)",
    accent: "var(--accent-soft)",
    "accent-foreground": "var(--accent-soft-fg)",
    destructive: "var(--danger)",
    // The palette has no danger-on colour. The accent foreground is the same
    // light ink on light and dark ink on dark, and clears both danger colours.
    "destructive-foreground": "var(--accent-fg)",
    input: "var(--border-strong)",
    ring: "var(--accent)",
  },
  radius: {
    sm: "var(--r-sm)",
    md: "var(--r-md)",
    lg: "var(--r-lg)",
    xl: "var(--r-xl)",
    full: "var(--r-full)",
  },
  font: {
    sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    mono: "var(--font-geist-mono), ui-monospace, monospace",
  },
} as const;

export type TailwindColorName = keyof typeof tailwindTheme.colors;

/** The exact contents of tailwind.css. The file and this output must stay equal. */
export function renderTailwindThemeCss(): string {
  const colors = Object.entries(tailwindTheme.colors).map(
    ([name, value]) => `  --color-${name}: ${value};`,
  );
  const radius = Object.entries(tailwindTheme.radius).map(
    ([name, value]) => `  --radius-${name}: ${value};`,
  );
  const font = Object.entries(tailwindTheme.font).map(
    ([name, value]) => `  --font-${name}: ${value};`,
  );

  return [
    "/* Generated from src/tailwind.ts. The unit test compares this file to",
    "   renderTailwindThemeCss(); do not edit it by hand. */",
    "",
    "@theme inline {",
    ...colors,
    "",
    ...radius,
    "",
    ...font,
    "}",
    "",
  ].join("\n");
}
