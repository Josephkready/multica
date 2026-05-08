import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceId } from "@multica/core/hooks";
import { issueDetailOptions } from "@multica/core/issues/queries";

import { IssueDetailView } from "@/components/issue/issue-detail-view";

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceId();

  // Read identifier from cache (won't trigger fetch — IssueDetailView fetches).
  // Cheaper than threading state up from the view component.
  const { data: issue } = useQuery({
    ...issueDetailOptions(wsId, id ?? ""),
    enabled: !!id,
  });

  return (
    <>
      <Stack.Screen options={{ title: issue?.identifier ?? "" }} />
      {id ? <IssueDetailView issueId={id} /> : null}
    </>
  );
}
