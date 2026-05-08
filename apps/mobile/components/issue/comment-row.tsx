import { Text, View } from "react-native";
import type { TimelineEntry } from "@multica/core/types";

import { ActorAvatar } from "@/components/ui/actor-avatar";
import { Markdown } from "@/components/ui/markdown";
import { ReactionList } from "@/components/issue/reaction-list";
import { useTimeAgo } from "@/lib/use-time-ago";
import { useActorName } from "@multica/core/workspace/hooks";

// Renders a "comment" timeline entry. TimelineEntry shape from
// @multica/core/types/activity.ts; comment-side fields are optional so
// guard with fallbacks.
export function CommentRow({ entry }: { entry: TimelineEntry }) {
  const timeAgo = useTimeAgo(entry.created_at);
  const { getActorName } = useActorName();
  const authorName = getActorName(entry.actor_type, entry.actor_id);
  const content = entry.content ?? "";
  const reactions = entry.reactions ?? [];

  return (
    <View className="flex-row gap-3 px-4 py-3">
      <ActorAvatar type={entry.actor_type as "member" | "agent"} id={entry.actor_id} size={28} />
      <View className="flex-1">
        <View className="flex-row items-baseline gap-2">
          <Text className="text-foreground text-sm font-semibold">
            {authorName}
          </Text>
          {entry.actor_type === "agent" && (
            <Text className="text-muted-foreground text-xs">Agent</Text>
          )}
          <Text className="text-muted-foreground text-xs">{timeAgo}</Text>
        </View>
        <Markdown content={content} variant="comment" />
        {reactions.length > 0 && <ReactionList reactions={reactions} />}
      </View>
    </View>
  );
}
