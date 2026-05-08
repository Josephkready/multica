import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import type { Token, Tokens } from "marked";

import { COLOR, HEADING_SIZE, VARIANT, type Variant } from "./theme";
import { InlineTokens } from "./inline-tokens";
import { CodeBlock } from "./code-block";
import { MarkdownImage } from "./markdown-image";

// Top-level block dispatcher. marked's lexer returns Token[] where each top
// element is a block (paragraph / heading / list / blockquote / code /
// table / hr / space / html / image-as-paragraph).
export function BlockTokens({
  tokens,
  variant = "default",
}: {
  tokens: Token[];
  variant?: Variant;
}) {
  return (
    <View>
      {tokens.map((t, i) => (
        <BlockToken key={i} token={t} variant={variant} />
      ))}
    </View>
  );
}

function BlockToken({
  token,
  variant,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token: any;
  variant: Variant;
}) {
  const v = VARIANT[variant];

  switch (token.type) {
    case "paragraph": {
      // A paragraph that is a SINGLE image becomes a block image (rendering
      // an Image inside a Text breaks RN). Otherwise normal inline text.
      const onlyImage =
        token.tokens?.length === 1 && token.tokens[0]?.type === "image";
      if (onlyImage) {
        const img = token.tokens[0] as Tokens.Image;
        return <MarkdownImage uri={img.href} alt={img.text} />;
      }
      return (
        <Text
          selectable
          style={{
            color: COLOR.foreground,
            fontSize: v.bodySize,
            lineHeight: v.lineHeight,
            marginVertical: v.paragraphSpacing,
          }}
        >
          <InlineTokens
            tokens={token.tokens}
            textStyle={{
              color: COLOR.foreground,
              fontSize: v.bodySize,
              lineHeight: v.lineHeight,
            }}
          />
        </Text>
      );
    }

    case "heading": {
      const depth = (token.depth as 1 | 2 | 3 | 4 | 5 | 6) ?? 2;
      const size = HEADING_SIZE[depth];
      return (
        <Text
          style={{
            color: COLOR.foreground,
            fontSize: size,
            lineHeight: size * 1.3,
            fontWeight: depth <= 2 ? "700" : "600",
            marginTop: depth <= 2 ? 16 : 12,
            marginBottom: 6,
          }}
        >
          <InlineTokens
            tokens={token.tokens}
            textStyle={{ color: COLOR.foreground, fontSize: size, fontWeight: depth <= 2 ? "700" : "600" }}
          />
        </Text>
      );
    }

    case "blockquote":
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: COLOR.border,
            paddingLeft: 12,
            paddingVertical: 4,
            backgroundColor: COLOR.muted,
            marginVertical: 8,
          }}
        >
          <BlockTokens tokens={token.tokens ?? []} variant={variant} />
        </View>
      );

    case "code":
      return <CodeBlock code={token.text ?? ""} lang={token.lang} />;

    case "list": {
      const listToken = token as Tokens.List;
      return (
        <View style={{ marginVertical: 6 }}>
          {listToken.items.map((item, i) => (
            <ListItem
              key={i}
              item={item}
              ordered={listToken.ordered}
              index={i + (Number(listToken.start) || 1)}
              variant={variant}
            />
          ))}
        </View>
      );
    }

    case "table":
      return <TableBlock token={token as Tokens.Table} variant={variant} />;

    case "hr":
      return (
        <View
          style={{
            height: 1,
            backgroundColor: COLOR.border,
            marginVertical: 12,
          }}
        />
      );

    case "space":
      return <View style={{ height: v.paragraphSpacing }} />;

    case "html":
      // Surface raw HTML as muted monospace text. Don't parse / render.
      return (
        <Text
          style={{
            color: COLOR.mutedForeground,
            fontFamily: "Menlo",
            fontSize: 13,
            marginVertical: v.paragraphSpacing,
          }}
        >
          {token.text}
        </Text>
      );

    default:
      // Unknown block — try to surface text content if present.
      if (typeof token.text === "string") {
        return (
          <Text style={{ color: COLOR.foreground, marginVertical: 4 }}>
            {token.text}
          </Text>
        );
      }
      return null;
  }
}

function ListItem({
  item,
  ordered,
  index,
  variant,
}: {
  item: Tokens.ListItem;
  ordered: boolean;
  index: number;
  variant: Variant;
}) {
  const v = VARIANT[variant];
  const bulletWidth = ordered ? 24 : 16;

  // GFM task list — `[ ]` / `[x]` rendered as a checkbox-ish glyph.
  let bullet: React.ReactNode;
  if (item.task) {
    bullet = (
      <Text
        style={{
          fontSize: v.bodySize,
          color: item.checked ? COLOR.brand : COLOR.mutedForeground,
          width: bulletWidth,
        }}
      >
        {item.checked ? "☑︎" : "☐"}
      </Text>
    );
  } else if (ordered) {
    bullet = (
      <Text
        style={{
          fontSize: v.bodySize,
          color: COLOR.foreground,
          width: bulletWidth,
        }}
      >
        {index}.
      </Text>
    );
  } else {
    bullet = (
      <Text
        style={{
          fontSize: v.bodySize,
          color: COLOR.foreground,
          width: bulletWidth,
        }}
      >
        •
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: "row", marginVertical: 2 }}>
      {bullet}
      <View style={{ flex: 1 }}>
        <BlockTokens tokens={item.tokens ?? []} variant={variant} />
      </View>
    </View>
  );
}

function TableBlock({
  token,
  variant,
}: {
  token: Tokens.Table;
  variant: Variant;
}) {
  const v = VARIANT[variant];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginVertical: 8 }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: COLOR.border,
          borderRadius: 6,
        }}
      >
        {/* header row */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: COLOR.muted,
            borderBottomWidth: 1,
            borderBottomColor: COLOR.border,
          }}
        >
          {token.header.map((cell, i) => (
            <TableCell
              key={i}
              cell={cell}
              isHeader
              align={token.align?.[i]}
              variant={variant}
            />
          ))}
        </View>
        {/* body rows */}
        {token.rows.map((row, ri) => (
          <View
            key={ri}
            style={{
              flexDirection: "row",
              borderBottomWidth: ri < token.rows.length - 1 ? 1 : 0,
              borderBottomColor: COLOR.border,
            }}
          >
            {row.map((cell, ci) => (
              <TableCell
                key={ci}
                cell={cell}
                align={token.align?.[ci]}
                variant={variant}
              />
            ))}
          </View>
        ))}
      </View>
      {/* hold this width hint so it can scroll */}
      <View style={{ width: 12 }} />
      {/* spacer */}
      {void v}
    </ScrollView>
  );
}

function TableCell({
  cell,
  isHeader,
  align,
  variant,
}: {
  cell: Tokens.TableCell;
  isHeader?: boolean;
  align?: "center" | "left" | "right" | null;
  variant: Variant;
}) {
  const v = VARIANT[variant];
  return (
    <View
      style={{
        minWidth: 100,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRightWidth: 1,
        borderRightColor: COLOR.border,
      }}
    >
      <Text
        style={{
          color: COLOR.foreground,
          fontSize: v.bodySize - 1,
          fontWeight: isHeader ? "600" : "400",
          textAlign: align ?? "left",
        }}
      >
        <InlineTokens
          tokens={cell.tokens}
          textStyle={{
            color: COLOR.foreground,
            fontSize: v.bodySize - 1,
            fontWeight: isHeader ? "600" : "400",
          }}
        />
      </Text>
    </View>
  );
}
