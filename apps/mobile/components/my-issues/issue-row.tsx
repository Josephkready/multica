import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import type { Issue } from "@multica/core/types";

import { ActorAvatar } from "@/components/ui/actor-avatar";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";

// My-issues row — Linear-style: status icon (left), title (truncate), assignee
// avatar (right). Less visual weight than inbox rows since this is a working
// list, not a notification stream.
export function MyIssueRow({
  issue,
  onPress,
}: {
  issue: Issue;
  onPress: () => void;
}) {
  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-accent"
    >
      <StatusIcon status={issue.status} size={16} />
      <Text
        className="text-foreground text-base flex-1"
        numberOfLines={1}
      >
        {issue.title}
      </Text>
      {issue.priority !== "none" && (
        <PriorityIcon priority={issue.priority} size={14} />
      )}
      {issue.assignee_type && issue.assignee_id ? (
        <ActorAvatar
          type={issue.assignee_type}
          id={issue.assignee_id}
          size={22}
        />
      ) : (
        <View
          className="rounded-full border border-dashed border-muted-foreground"
          style={{ width: 22, height: 22 }}
        />
      )}
    </Pressable>
  );
}
