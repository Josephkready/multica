import * as SecureStore from "expo-secure-store";
import type { StorageAdapter } from "@multica/core/types/storage";

// expo-secure-store stores values in iOS Keychain / Android Keystore.
// Sync API (SDK 50+) matches StorageAdapter's sync contract for getItem/setItem.
// removeItem only has async; we fire-and-forget — adapter doesn't await.
//
// SecureStore restricts keys to [A-Za-z0-9._-]. multica's core uses keys with
// ":" / "/" separators (e.g. "chat:current_session"). Sanitize by hex-escaping
// any non-allowed char: deterministic, 1:1, no collisions, debuggable.
function sanitize(key: string): string {
  if (!key) throw new Error("Storage key cannot be empty");
  return key.replace(
    /[^A-Za-z0-9._-]/g,
    (c) => `_${c.charCodeAt(0).toString(16)}_`,
  );
}

export const mobileStorage: StorageAdapter = {
  getItem: (key) => SecureStore.getItem(sanitize(key)) ?? null,
  setItem: (key, value) => SecureStore.setItem(sanitize(key), value),
  removeItem: (key) => {
    SecureStore.deleteItemAsync(sanitize(key)).catch(() => {});
  },
};
