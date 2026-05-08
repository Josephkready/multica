import { Fragment } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@multica/core/api";
import type { TimelineEntry } from "@multica/core/types";

import { CommentRow } from "@/components/issue/comment-row";
import { ActivityRow } from "@/components/issue/activity-row";

// Renders the issue's full timeline (comments + activity events combined).
// multica's `listTimeline` API is the single source that returns both —
// `listComments` only returns comment-table rows and misses pure activity
// events (status_change / cycle_move) stored in activity_log.
//
// v1 fetches the latest page only (limit 50). Older entries don't appear
// until M2 adds cursor pagination + "Load older" affordance.
export function CommentList({ issueId }: { issueId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["issues", issueId, "timeline", "latest"],
    queryFn: () => api.listTimeline(issueId, { mode: "latest" }, 50),
  });

  if (isLoading) {
    return (
      <View className="px-4 py-6 items-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View className="px-4 py-4">
        <Text className="text-destructive text-sm">
          Failed to load activity
        </Text>
      </View>
    );
  }

  const entries = (data?.entries ?? []) as TimelineEntry[];
  if (entries.length === 0) {
    return (
      <View className="px-4 py-6">
        <Text className="text-muted-foreground text-sm text-center">
          No activity yet
        </Text>
      </View>
    );
  }

  // Backend returns newest-first; reverse for top-to-bottom chronological read.
  const sorted = [...entries].reverse();

  return (
    <View>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-muted-foreground text-xs uppercase tracking-wider">
          Activity
        </Text>
      </View>
      {sorted.map((entry, i) => (
        <Fragment key={entry.id}>
          {i > 0 && <View className="h-px bg-border ml-12" />}
          {entry.type === "comment" ? (
            <CommentRow entry={entry} />
          ) : (
            <ActivityRow entry={entry} />
          )}
        </Fragment>
      ))}
    </View>
  );
}
