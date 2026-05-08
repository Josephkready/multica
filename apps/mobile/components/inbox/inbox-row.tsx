import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { InboxItem, InboxSeverity } from "@multica/core/types";

import { ActorAvatar } from "@/components/ui/actor-avatar";
import { StatusIcon } from "@/components/ui/status-icon";
import { InboxDetailLabel } from "@/components/inbox/inbox-detail-label";
import { useTimeAgo } from "@/lib/use-time-ago";
import { getInboxDisplayTitle } from "@/lib/inbox";

interface Props {
  item: InboxItem;
  onPress: () => void;
}

// Severity → unread-dot color (only shown when !read).
// action_required = destructive (red); attention = warning (yellow);
// info = brand (blue, default).
const SEVERITY_DOT_CLASS: Record<InboxSeverity, string> = {
  action_required: "bg-destructive",
  attention: "bg-warning",
  info: "bg-brand",
};

export function InboxRow({ item, onPress }: Props) {
  const title = getInboxDisplayTitle(item);
  const timeAgo = useTimeAgo(item.created_at);

  // Use actor when present; fall back to recipient (matches desktop pattern).
  const actorType = item.actor_type ?? item.recipient_type;
  const actorId = item.actor_id ?? item.recipient_id;

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-accent"
    >
      {/* Unread dot — fixed-width slot keeps read/unread rows aligned. */}
      <View className="w-2 items-center">
        {!item.read && (
          <View
            className={`w-2 h-2 rounded-full ${SEVERITY_DOT_CLASS[item.severity]}`}
          />
        )}
      </View>

      {/* Actor avatar (member / agent / system) */}
      <ActorAvatar type={actorType} id={actorId} size={28} />

      {/* Middle: title + detail label */}
      <View className="flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className={
            item.read
              ? "text-foreground text-base"
              : "text-foreground text-base font-semibold"
          }
        >
          {title}
        </Text>
        <InboxDetailLabel item={item} />
      </View>

      {/* Right: status icon (top) over relative time (bottom), right-aligned. */}
      <View className="items-end gap-1">
        {item.issue_status && <StatusIcon status={item.issue_status} size={14} />}
        <Text className="text-muted-foreground text-xs">{timeAgo}</Text>
      </View>
    </Pressable>
  );
}
