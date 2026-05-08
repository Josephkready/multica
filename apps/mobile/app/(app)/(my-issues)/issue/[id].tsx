import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceId } from "@multica/core/hooks";
import { issueDetailOptions } from "@multica/core/issues/queries";

import { IssueDetailView } from "@/components/issue/issue-detail-view";

// Same screen body as inbox/issue/[id] — Stack route per tab keeps each
// tab's nav stack independent (matches Linear / Twitter behavior).
export default function MyIssuesIssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceId();

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
