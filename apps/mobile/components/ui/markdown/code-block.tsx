import { ScrollView, Text, View } from "react-native";

import { COLOR, FONT_MONO } from "./theme";

// Fenced code block. v1 has no syntax highlighting (M2 will plug in a
// JS-side highlighter like shiki or react-native-prism). For now, plain
// monospace on a muted background. Wide lines scroll horizontally — overflow
// would otherwise break the issue-detail layout on small screens.
export function CodeBlock({
  code,
  // lang reserved for v2 syntax highlighting
  // lang,
}: {
  code: string;
  lang?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: COLOR.muted,
        borderRadius: 8,
        marginVertical: 8,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: 12 }}
      >
        <Text
          selectable
          style={{
            fontFamily: FONT_MONO,
            fontSize: 13,
            color: COLOR.foreground,
            lineHeight: 20,
          }}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}
