import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceId } from "@multica/core/hooks";
import { issueDetailOptions } from "@multica/core/issues/queries";
import { STATUS_CONFIG } from "@multica/core/issues/config/status";
import { PRIORITY_CONFIG } from "@multica/core/issues/config/priority";
import { useActorName } from "@multica/core/workspace/hooks";

import { ActorAvatar } from "@/components/ui/actor-avatar";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { Markdown } from "@/components/ui/markdown";
import { CommentList } from "@/components/issue/comment-list";
import { CommentComposer } from "@/components/issue/comment-composer";
import { ReactionList } from "@/components/issue/reaction-list";

interface Props {
  issueId: string;
}

export function IssueDetailView({ issueId }: Props) {
  const wsId = useWorkspaceId();
  const { data: issue, isLoading, error } = useQuery(
    issueDetailOptions(wsId, issueId),
  );
  const { getActorName } = useActorName();

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  if (error || !issue) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-destructive text-center">
          {error instanceof Error
            ? error.message
            : "Issue not found or unavailable."}
        </Text>
      </View>
    );
  }

  const assigneeName =
    issue.assignee_type && issue.assignee_id
      ? getActorName(issue.assignee_type, issue.assignee_id)
      : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "white" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-background"
        keyboardShouldPersistTaps="handled"
        // composer (~64) + iOS UITabBar (49) + safe-area home indicator (~34) + buffer
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <View className="px-4 pt-4 pb-6 gap-4">
          {/* Identifier */}
          <Text className="text-muted-foreground text-xs uppercase tracking-wider">
            {issue.identifier}
          </Text>

          {/* Title */}
          <Text
            selectable
            className="text-foreground text-2xl font-semibold leading-tight"
          >
            {issue.title}
          </Text>

          {/* Meta chips: status / priority / assignee */}
          <View className="flex-row flex-wrap gap-2">
            <Chip>
              <StatusIcon status={issue.status} size={14} />
              <Text className="text-foreground text-sm">
                {STATUS_CONFIG[issue.status].label}
              </Text>
            </Chip>

            <Chip>
              <PriorityIcon priority={issue.priority} size={14} />
              <Text className="text-foreground text-sm">
                {PRIORITY_CONFIG[issue.priority].label}
              </Text>
            </Chip>

            {assigneeName && issue.assignee_type && issue.assignee_id ? (
              <Chip>
                <ActorAvatar
                  type={issue.assignee_type}
                  id={issue.assignee_id}
                  size={18}
                />
                <Text className="text-foreground text-sm">{assigneeName}</Text>
              </Chip>
            ) : (
              <Chip>
                <Text className="text-muted-foreground text-sm">Unassigned</Text>
              </Chip>
            )}
          </View>

          {/* Description */}
          {issue.description ? (
            <View className="mt-2">
              <Markdown content={issue.description} />
            </View>
          ) : (
            <Text className="text-muted-foreground text-sm italic mt-2">
              No description.
            </Text>
          )}

          {/* Issue-level reactions */}
          {issue.reactions && issue.reactions.length > 0 && (
            <ReactionList reactions={issue.reactions} />
          )}
        </View>

        {/* Divider */}
        <View className="h-px bg-border mx-4" />

        {/* Comments + Activity */}
        <CommentList issueId={issueId} />
      </ScrollView>

      <CommentComposer issueId={issueId} />
    </KeyboardAvoidingView>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-muted">
      {children}
    </View>
  );
}
