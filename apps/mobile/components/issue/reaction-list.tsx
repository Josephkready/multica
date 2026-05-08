import { Text, View } from "react-native";

// Multica's Reaction shape varies slightly between Issue.reactions and
// Comment.reactions. Both have `emoji`; count comes from `count` or
// `user_ids?.length`. v1 reads either.
interface Reaction {
  emoji: string;
  count?: number;
  user_ids?: string[];
}

interface Props {
  reactions: Reaction[];
}

// Read-only reaction chip row. v1 doesn't support add/remove (defer M2).
export function ReactionList({ reactions }: Props) {
  if (!reactions || reactions.length === 0) return null;

  // De-dup by emoji (sometimes API returns one row per user).
  const grouped = new Map<string, number>();
  for (const r of reactions) {
    const c = r.count ?? r.user_ids?.length ?? 1;
    grouped.set(r.emoji, (grouped.get(r.emoji) ?? 0) + c);
  }

  return (
    <View className="flex-row flex-wrap gap-1.5 mt-1">
      {Array.from(grouped.entries()).map(([emoji, count]) => (
        <View
          key={emoji}
          className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-muted"
        >
          <Text className="text-base">{emoji}</Text>
          <Text className="text-muted-foreground text-xs">{count}</Text>
        </View>
      ))}
    </View>
  );
}
