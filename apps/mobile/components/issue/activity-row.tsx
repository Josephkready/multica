import { Text, View } from "react-native";
import type {
  TimelineEntry,
  IssueStatus,
  IssuePriority,
} from "@multica/core/types";
import { STATUS_CONFIG } from "@multica/core/issues/config/status";
import { PRIORITY_CONFIG } from "@multica/core/issues/config/priority";
import { useActorName } from "@multica/core/workspace/hooks";

import { useTimeAgo } from "@/lib/use-time-ago";

// Renders an "activity" timeline entry as a Linear-style bullet row:
// open circle on the left, descriptive sentence in the middle, time on the
// right. Format mirrors `inbox-detail-label.tsx` (status_changed →
// "Set status to In Progress" using STATUS_CONFIG.label, etc).
export function ActivityRow({ entry }: { entry: TimelineEntry }) {
  const { getActorName } = useActorName();
  const timeAgo = useTimeAgo(entry.created_at);
  const actor = getActorName(entry.actor_type, entry.actor_id);

  const sentence = format(actor, entry);

  return (
    <View className="flex-row items-start gap-3 px-4 py-2">
      <View
        className="rounded-full border border-muted-foreground/40"
        style={{ width: 8, height: 8, marginTop: 6 }}
      />
      <View className="flex-1 flex-row items-center gap-2">
        <Text className="text-muted-foreground text-sm flex-1" numberOfLines={2}>
          {sentence}
        </Text>
        <Text className="text-muted-foreground text-xs shrink-0">{timeAgo}</Text>
      </View>
    </View>
  );
}

// Convert activity action + details into a human-readable sentence.
// Default fallback: "{actor} {action}" — keeps unknown actions visible.
function format(actor: string, entry: TimelineEntry): string {
  const action = entry.action ?? "";
  const d = (entry.details ?? {}) as Record<string, unknown>;
  const coalesce = entry.coalesced_count && entry.coalesced_count > 1
    ? ` (×${entry.coalesced_count})`
    : "";

  switch (action) {
    case "status_changed":
    case "status_change": {
      const to = d.to as IssueStatus | undefined;
      const label = to ? STATUS_CONFIG[to]?.label : undefined;
      return `${actor} set status to ${label ?? to ?? "?"}${coalesce}`;
    }
    case "priority_changed":
    case "priority_change": {
      const to = d.to as IssuePriority | undefined;
      const label = to ? PRIORITY_CONFIG[to]?.label : undefined;
      return `${actor} set priority to ${label ?? to ?? "?"}${coalesce}`;
    }
    case "assignee_changed":
    case "assignee_change":
      return `${actor} changed the assignee${coalesce}`;
    case "due_date_changed":
    case "due_date_change":
      return d.to
        ? `${actor} set due date to ${d.to}${coalesce}`
        : `${actor} removed the due date${coalesce}`;
    case "issue_created":
    case "created":
      return `${actor} created the issue${coalesce}`;
    case "linked_issue":
      return `${actor} linked an issue${coalesce}`;
    case "labels_changed":
    case "labels_change":
      return `${actor} updated labels${coalesce}`;
    default:
      return action
        ? `${actor} ${action.replace(/_/g, " ")}${coalesce}`
        : `${actor} performed an action${coalesce}`;
  }
}
