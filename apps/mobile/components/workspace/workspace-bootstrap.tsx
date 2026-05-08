import { type ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { workspaceListOptions } from "@multica/core/workspace/queries";
import { setCurrentWorkspace } from "@multica/core/platform";
import { WorkspaceSlugProvider } from "@multica/core/paths";

// Auto-pick the first workspace and lock the app to it for v1.
// Mirrors desktop's [workspaceSlug]/layout.tsx pattern, minus URL slug.
//
// Two side effects must happen for `useWorkspaceId()` / `useCurrentWorkspace()`
// to work in children:
//   1. setCurrentWorkspace(slug, id) — writes a module-level singleton used
//      by WS reconnect, persist namespace.
//   2. <WorkspaceSlugProvider slug=...> — provides slug via React Context;
//      this is what useCurrentWorkspace actually reads (not the singleton).
//
// Both must be present. setCurrentWorkspace is called in render (idempotent
// on slug-equality, so safe). Provider wraps children.
export function WorkspaceBootstrap({ children }: { children: ReactNode }) {
  const { data: workspaces, isLoading, error } = useQuery(workspaceListOptions());
  const ws = workspaces?.[0];

  if (ws) setCurrentWorkspace(ws.slug, ws.id);

  if (isLoading || !workspaces) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-destructive text-center">
          Failed to load workspaces.{"\n"}
          {error instanceof Error ? error.message : String(error)}
        </Text>
      </View>
    );
  }

  if (workspaces.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-foreground text-base text-center">
          You have no workspaces yet.{"\n"}
          Create one on the desktop app first.
        </Text>
      </View>
    );
  }

  if (!ws) return null;

  return (
    <WorkspaceSlugProvider slug={ws.slug}>{children}</WorkspaceSlugProvider>
  );
}
