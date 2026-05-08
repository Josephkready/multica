import { Stack } from "expo-router";

export default function MeStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Me" }} />
    </Stack>
  );
}
