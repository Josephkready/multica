import { Stack } from "expo-router";

export default function InboxStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: false,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Inbox" }} />
      <Stack.Screen
        name="issue/[id]"
        options={{
          headerLargeTitle: false,
          headerBackTitle: "Inbox",
        }}
      />
    </Stack>
  );
}
