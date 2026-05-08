import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@multica/core/auth";

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return user ? (
    <Redirect href="/(app)/(inbox)" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
