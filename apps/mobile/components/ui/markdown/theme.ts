// Token-aligned theme for the markdown renderer.
// Hex values mirror multica's mobile tailwind.config.js — keep in sync if
// either changes. Colors only here; spacings / fontSizes live in the renderers
// because they're context-dependent (block vs inline).

export const COLOR = {
  foreground: "hsl(240 10% 4%)",
  mutedForeground: "hsl(240 4% 46%)",
  muted: "hsl(240 5% 96%)",
  border: "hsl(240 6% 90%)",
  brand: "hsl(220 60% 50%)",
  brandForeground: "hsl(0 0% 98%)",
  destructive: "hsl(0 84% 60%)",
} as const;

// Heading scale — slightly tighter than web (mobile screen).
// Web uses 30/24/20/18 for h1-h4; mobile collapses to 24/20/18/16.
export const HEADING_SIZE: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 24,
  2: 20,
  3: 18,
  4: 16,
  5: 15,
  6: 14,
};

export const FONT_MONO = "Menlo";

export type Variant = "default" | "comment";

// Comment variant trims body size + paragraph spacing for tight chat-style
// rendering inside CommentRow.
export const VARIANT = {
  default: { bodySize: 16, lineHeight: 24, paragraphSpacing: 6 },
  comment: { bodySize: 15, lineHeight: 22, paragraphSpacing: 4 },
} as const;
