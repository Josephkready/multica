import { Text } from "react-native";
import type {
  InboxItem,
  InboxItemType,
  IssueStatus,
  IssuePriority,
} from "@multica/core/types";
import { STATUS_CONFIG } from "@multica/core/issues/config/status";
import { PRIORITY_CONFIG } from "@multica/core/issues/config/priority";

// Simplified port of packages/views/inbox/components/inbox-detail-label.tsx.
// v1: no i18n, no inline icons, no actor-name lookup. Uses STATUS_CONFIG /
// PRIORITY_CONFIG for proper labels (e.g. "In Progress" not "in_progress").
const TYPE_LABEL: Record<InboxItemType, string> = {
  issue_assigned: "Assigned the issue",
  unassigned: "Removed the assignee",
  assignee_changed: "Changed the assignee",
  status_changed: "Changed status",
  priority_changed: "Changed priority",
  due_date_changed: "Changed due date",
  new_comment: "Commented",
  mentioned: "Mentioned you",
  review_requested: "Requested review",
  task_completed: "Completed task",
  task_failed: "Task failed",
  agent_blocked: "Agent needs help",
  agent_completed: "Agent completed",
  reaction_added: "Reacted",
  quick_create_done: "Created",
  quick_create_failed: "Failed to create",
};

function format(item: InboxItem): string {
  const d = item.details ?? {};
  switch (item.type) {
    case "status_changed": {
      const to = d.to as IssueStatus | undefined;
      const label = to ? STATUS_CONFIG[to]?.label : undefined;
      return label ? `Set status to ${label}` : TYPE_LABEL[item.type];
    }
    case "priority_changed": {
      const to = d.to as IssuePriority | undefined;
      const label = to ? PRIORITY_CONFIG[to]?.label : undefined;
      return label ? `Set priority to ${label}` : TYPE_LABEL[item.type];
    }
    case "due_date_changed":
      return d.to ? `Set due date to ${d.to}` : "Removed due date";
    case "new_comment":
      return item.body ? item.body.slice(0, 80) : TYPE_LABEL[item.type];
    case "reaction_added":
      return d.emoji ? `Reacted ${d.emoji}` : TYPE_LABEL[item.type];
    default:
      return TYPE_LABEL[item.type] ?? "";
  }
}

export function InboxDetailLabel({ item }: { item: InboxItem }) {
  return (
    <Text numberOfLines={1} className="text-muted-foreground text-sm">
      {format(item)}
    </Text>
  );
}
