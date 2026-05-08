import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceId } from "@multica/core/hooks";
import {
  memberListOptions,
  agentListOptions,
} from "@multica/core/workspace/queries";

import { ActorAvatar } from "@/components/ui/actor-avatar";

export interface MentionSelection {
  type: "member" | "agent";
  id: string;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (s: MentionSelection) => void;
}

type Row =
  | { kind: "header"; label: string }
  | { kind: "item"; type: "member" | "agent"; id: string; name: string };

// Modal-presented picker with sectioned list (Members / Agents) + search.
// Select → returns { type, id, name } to caller; the composer turns this into
// `[@Name](mention://type/id) ` markdown which the backend parses to trigger
// agents (when type="agent").
export function MentionPicker({ visible, onClose, onSelect }: Props) {
  const wsId = useWorkspaceId();
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const [search, setSearch] = useState("");

  const data = useMemo<Row[]>(() => {
    const q = search.toLowerCase().trim();
    const filteredMembers = members
      .filter((m) => !q || (m.name ?? "").toLowerCase().includes(q))
      .filter((m) => !!m.user_id);
    const filteredAgents = agents
      .filter((a) => !q || (a.name ?? "").toLowerCase().includes(q))
      .filter((a) => !!a.id);

    const rows: Row[] = [];
    if (filteredMembers.length > 0) {
      rows.push({ kind: "header", label: "Members" });
      for (const m of filteredMembers) {
        rows.push({
          kind: "item",
          type: "member",
          id: m.user_id,
          name: m.name ?? "Unknown",
        });
      }
    }
    if (filteredAgents.length > 0) {
      rows.push({ kind: "header", label: "Agents" });
      for (const a of filteredAgents) {
        rows.push({
          kind: "item",
          type: "agent",
          id: a.id,
          name: a.name ?? "Unknown Agent",
        });
      }
    }
    return rows;
  }, [members, agents, search]);

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="formSheet"
      animationType="slide"
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Pressable onPress={onClose} hitSlop={8}>
            <Text className="text-foreground text-base">Cancel</Text>
          </Pressable>
          <Text className="text-foreground text-base font-semibold">
            Mention
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <View className="px-4 py-3">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search…"
            placeholderTextColor="hsl(240 4% 46%)"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              height: 40,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: "hsl(240 6% 90%)",
              borderRadius: 8,
              fontSize: 16,
              color: "hsl(240 10% 4%)",
              backgroundColor: "white",
            }}
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(item, i) =>
            item.kind === "header" ? `h-${item.label}` : `i-${item.id}-${i}`
          }
          renderItem={({ item }) => {
            if (item.kind === "header") {
              return (
                <View className="px-4 pt-4 pb-2">
                  <Text className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    {item.label}
                  </Text>
                </View>
              );
            }
            return (
              <Pressable
                onPress={() =>
                  onSelect({ type: item.type, id: item.id, name: item.name })
                }
                className="flex-row items-center gap-3 px-4 py-3 active:bg-accent"
              >
                <ActorAvatar type={item.type} id={item.id} size={28} />
                <Text className="text-foreground text-base flex-1" numberOfLines={1}>
                  {item.name}
                </Text>
                {item.type === "agent" && (
                  <Text className="text-muted-foreground text-xs">Agent</Text>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="px-4 pt-8 items-center">
              <Text className="text-muted-foreground">No matches</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}
