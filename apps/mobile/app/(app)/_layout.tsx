import { Redirect } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { useAuthStore } from "@multica/core/auth";

import { WorkspaceBootstrap } from "@/components/workspace/workspace-bootstrap";

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <WorkspaceBootstrap>
      <NativeTabs>
        <NativeTabs.Trigger name="(inbox)">
          <Icon sf="tray.fill" />
          <Label>Inbox</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(my-issues)">
          <Icon sf="checkmark.circle" />
          <Label>My Issues</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(me)">
          <Icon sf="person.crop.circle" />
          <Label>Me</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </WorkspaceBootstrap>
  );
}
