import { Stack } from "expo-router";

export default function MyIssuesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: false,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Issues" }} />
      <Stack.Screen
        name="issue/[id]"
        options={{
          headerLargeTitle: false,
          headerBackTitle: "My Issues",
        }}
      />
    </Stack>
  );
}
