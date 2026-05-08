import { useMemo } from "react";
import { marked } from "marked";

import { BlockTokens } from "./block-tokens";
import type { Variant } from "./theme";

// Mobile markdown renderer.
//
// Architecture: marked.js parses → we render to RN components.
// The parsing layer is a solved problem (CommonMark + GFM via marked.js,
// battle-tested). The rendering layer is multica-specific (token-aligned
// theme, mention chip, expo-image, horizontally-scrolling code blocks &
// tables) and lives entirely in apps/mobile/components/ui/markdown/.
//
// Supported in v1:
//   block: paragraph, heading 1-6, blockquote, code (no syntax highlight),
//          ordered/unordered list, GFM task list, GFM table, hr, space, html
//          (raw text fallback)
//   inline: text, strong, em, del, codespan, link, br, escape, html (raw),
//           mention chip via mention://type/id link protocol, image (block
//           rendered via expo-image with auto aspect-ratio)
//
// Out of v1 scope (graceful fallback rendering in place):
//   - KaTeX math (renders as raw $$...$$ text)
//   - Syntax highlighting in code blocks
//   - HTML blocks (rendered as monospace text)
//   - File-card detection (CDN URLs)
//   - Streaming / incremental rendering

export interface MarkdownProps {
  content: string;
  variant?: Variant;
}

// gfm: true — GitHub-flavored extensions (tables, strikethrough, task lists,
// auto-linkify of bare URLs).
// breaks: true — single newlines render as <br> (matches multica web's
// remark-breaks plugin so issue descriptions line up across platforms).
marked.setOptions({ gfm: true, breaks: true });

export function Markdown({ content, variant = "default" }: MarkdownProps) {
  const tokens = useMemo(() => {
    if (!content) return [];
    try {
      return marked.lexer(content);
    } catch {
      return [];
    }
  }, [content]);

  if (tokens.length === 0) return null;
  return <BlockTokens tokens={tokens} variant={variant} />;
}
