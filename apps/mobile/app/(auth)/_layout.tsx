import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@multica/core/auth";

export default function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  // Already signed in → bounce to app. Declarative; no router.replace, no useEffect.
  if (user) return <Redirect href="/(app)/(inbox)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
