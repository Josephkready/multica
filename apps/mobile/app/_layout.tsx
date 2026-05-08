// Must be first: polyfills crypto.getRandomValues for uuid lib used by core.
import "react-native-get-random-values";

import "../global.css";

import { Stack } from "expo-router";
import { CoreProvider } from "@multica/core/platform";
import { RESOURCES } from "@multica/views/locales";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { mobileStorage } from "@/src/platform/storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const WS_URL = process.env.EXPO_PUBLIC_WS_URL!;

export default function RootLayout() {
  return (
    // GestureHandlerRootView is REQUIRED at the root for any react-native-gesture-handler
    // primitive (Swipeable, PanGestureHandler) to work. Expo SDK 54 doesn't wrap automatically.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CoreProvider
        apiBaseUrl={API_URL}
        wsUrl={WS_URL}
        storage={mobileStorage}
        cookieAuth={false}
        identity={{ platform: "ios", version: "0.1.0" }}
        locale="en"
        resources={RESOURCES}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </CoreProvider>
    </GestureHandlerRootView>
  );
}
