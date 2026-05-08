import { Text } from "react-native";

import { COLOR } from "./theme";

// multica's mention protocol: `[label](mention://type/id)` where type is one
// of member / agent / issue / all. Backend regex parses this from comment
// markdown to trigger agent tasks (when type='agent'), so wire format must
// be preserved verbatim — only display style is mobile-specific.
//
// Visual hierarchy on mobile:
// - agent: brand-foreground on brand background (chip) — agents trigger tasks,
//   needs to stand out so users SEE what they @-ed
// - member / issue / all: brand color text, slightly bold — subtle inline ref

export function MentionChip({
  type,
  label,
}: {
  type: "member" | "agent" | "issue" | "all" | string;
  label: string;
}) {
  if (type === "agent") {
    return (
      <Text
        style={{
          color: COLOR.brandForeground,
          backgroundColor: COLOR.brand,
          fontWeight: "600",
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {label}
      </Text>
    );
  }
  return (
    <Text style={{ color: COLOR.brand, fontWeight: "500" }}>{label}</Text>
  );
}
