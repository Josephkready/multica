import * as React from "react";
import { Linking, Text } from "react-native";
import type { Token } from "marked";

import { COLOR, FONT_MONO } from "./theme";
import { MentionChip } from "./mention-chip";

const MENTION_REGEX =
  /^mention:\/\/(member|agent|issue|all)\/([0-9a-fA-F-]+|all)$/;

// Renders an array of inline marked tokens into nested <Text> nodes.
// Inline = "things that flow in a paragraph" (text / strong / em / codespan /
// link / br / del). Block-level images are handled by block-tokens; the
// `image` inline branch here handles "image inside a paragraph" (rare but
// possible) by deferring to the same display.
export function InlineTokens({
  // marked's union for inline children — narrowed via discriminator in the loop
  tokens,
  textStyle,
}: {
  tokens: Token[] | undefined;
  textStyle?: object;
}) {
  if (!tokens || tokens.length === 0) return null;
  return (
    <>
      {tokens.map((t, i) => (
        <InlineToken key={i} token={t} textStyle={textStyle} />
      ))}
    </>
  );
}

function InlineToken({
  token,
  textStyle,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token: any;
  textStyle?: object;
}) {
  switch (token.type) {
    case "text":
      // Inline text may itself contain tokens (e.g. when GFM parses link-likes
      // in plain text). If so, recurse; otherwise just emit the string.
      if (token.tokens) {
        return <InlineTokens tokens={token.tokens} textStyle={textStyle} />;
      }
      return <Text style={textStyle}>{token.text}</Text>;

    case "strong":
      return (
        <InlineTokens
          tokens={token.tokens}
          textStyle={{ ...textStyle, fontWeight: "700" }}
        />
      );

    case "em":
      return (
        <InlineTokens
          tokens={token.tokens}
          textStyle={{ ...textStyle, fontStyle: "italic" }}
        />
      );

    case "del":
      return (
        <InlineTokens
          tokens={token.tokens}
          textStyle={{ ...textStyle, textDecorationLine: "line-through" }}
        />
      );

    case "codespan":
      return (
        <Text
          style={{
            ...textStyle,
            fontFamily: FONT_MONO,
            fontSize: 13,
            backgroundColor: COLOR.muted,
            color: COLOR.foreground,
          }}
        >
          {" "}
          {token.text}{" "}
        </Text>
      );

    case "br":
      return <Text>{"\n"}</Text>;

    case "link": {
      const href = token.href as string;
      const label = extractText(token);
      const m = MENTION_REGEX.exec(href);
      if (m) {
        const [, type] = m;
        return <MentionChip type={type} label={label || token.text} />;
      }
      return (
        <Text
          style={{ ...textStyle, color: COLOR.brand }}
          onPress={() => {
            Linking.openURL(href).catch(() => {});
          }}
        >
          <InlineTokens tokens={token.tokens} textStyle={textStyle} />
        </Text>
      );
    }

    case "image":
      // Inline image inside a paragraph: render its alt as a styled inline
      // string (RN doesn't allow Image inside Text). Block-level images
      // handled by block-tokens.tsx.
      return (
        <Text style={{ ...textStyle, color: COLOR.mutedForeground }}>
          [image: {token.text || token.href}]
        </Text>
      );

    case "escape":
      return <Text style={textStyle}>{token.text}</Text>;

    case "html":
      // We don't render arbitrary HTML on mobile (security + complexity);
      // surface as raw text fallback.
      return (
        <Text
          style={{
            ...textStyle,
            color: COLOR.mutedForeground,
            fontFamily: FONT_MONO,
            fontSize: 13,
          }}
        >
          {token.text}
        </Text>
      );

    default:
      // Unknown inline token — best-effort render the raw text if present.
      if (typeof token.text === "string") {
        return <Text style={textStyle}>{token.text}</Text>;
      }
      return null;
  }
}

// Walks an inline token tree to extract a plain-text label. Used for
// MentionChip which needs a string regardless of nested formatting.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(token: any): string {
  if (typeof token.text === "string") return token.text;
  if (Array.isArray(token.tokens)) {
    return token.tokens.map(extractText).join("");
  }
  return "";
}
