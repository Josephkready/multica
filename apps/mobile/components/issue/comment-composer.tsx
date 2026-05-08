import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@multica/core/api";

import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  MentionPicker,
  type MentionSelection,
} from "@/components/issue/mention-picker";

// Sticky-bottom composer for issue detail. v1 features:
// 1. Multiline TextInput (autogrows up to ~5 lines)
// 2. @ button → opens MentionPicker; selecting appends `[@Name](mention://type/id) `
//    to text. Backend regex on `mention://agent/...` triggers the agent.
// 3. ↑ send button → POST /api/issues/{id}/comments; clears on success +
//    invalidates the local comment-list query.
//
// No edit / reply / attachment / cursor-aware mention insertion. Defer.
export function CommentComposer({ issueId }: { issueId: string }) {
  const [text, setText] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const create = useMutation({
    mutationFn: (content: string) => api.createComment(issueId, content),
    onSuccess: () => {
      setText("");
      // Invalidate timeline (which feeds the comment list); listComments key
      // is no longer used by mobile after the listTimeline switch.
      qc.invalidateQueries({
        queryKey: ["issues", issueId, "timeline", "latest"],
      });
    },
  });

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !create.isPending;

  const handleSend = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    create.mutate(trimmed);
  };

  const handleMentionSelect = (s: MentionSelection) => {
    setPickerVisible(false);
    const insert = `[@${s.name}](mention://${s.type}/${s.id}) `;
    setText((prev) => {
      // Add a space separator if prev is non-empty and doesn't end in whitespace.
      const sep = prev.length > 0 && !/\s$/.test(prev) ? " " : "";
      return prev + sep + insert;
    });
    // Refocus so the user can keep typing.
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      <View
        className="flex-row items-end gap-2 px-3 py-2 border-t border-border bg-background"
        // iOS UITabBar = 49pt + home-indicator safe area. NativeTabs (alpha)
        // doesn't propagate tab-bar height into useSafeAreaInsets, so we
        // offset manually. Replace with useNativeTabsHeight() once exposed.
        style={{ paddingBottom: insets.bottom + 49 }}
      >
        <Pressable
          onPress={() => setPickerVisible(true)}
          hitSlop={8}
          className="rounded-full bg-muted items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
          <Text className="text-muted-foreground text-base font-semibold">
            @
          </Text>
        </Pressable>

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Comment"
          placeholderTextColor="hsl(240 4% 46%)"
          multiline
          editable={!create.isPending}
          style={{
            flex: 1,
            minHeight: 36,
            maxHeight: 120,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 8,
            fontSize: 16,
            color: "hsl(240 10% 4%)",
            backgroundColor: "hsl(240 5% 96%)",
            borderRadius: 18,
          }}
        />

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: canSend ? "hsl(240 6% 10%)" : "hsl(240 5% 96%)",
          }}
        >
          {create.isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <IconSymbol
              name={"arrow.up" as any}
              size={18}
              color={canSend ? "white" : "hsl(240 4% 46%)"}
            />
          )}
        </Pressable>
      </View>

      <MentionPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleMentionSelect}
      />
    </>
  );
}
