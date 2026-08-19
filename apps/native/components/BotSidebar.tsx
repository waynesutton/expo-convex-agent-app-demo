import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import { GearSix, MagnifyingGlass, Plus } from "phosphor-react-native";
import { api } from "@expo-demo/backend/convex/_generated/api";
import { Id } from "@expo-demo/backend/convex/_generated/dataModel";
import { BotAvatar } from "@/components/BotAvatar";
import { relativeTime } from "@/lib/time";
import { theme } from "@/lib/theme";

// Desktop sidebar: the roster stays visible beside the chat on wide screens
// (Expo web). Same paper background as the canvas; a soft border separates.
export function BotSidebar({
  userId,
  activeBotId,
}: {
  userId: Id<"users">;
  activeBotId?: Id<"bots">;
}) {
  const convexClient = useConvex();
  const createThread = useMutation(api.threads.create);
  const bots = useQuery(api.bots.list, { userId });
  const user = useQuery(api.users.get, { userId });

  const openBot = async (botId: Id<"bots">) => {
    const existing = await convexClient.query(api.threads.latestForBot, { botId });
    const threadId = existing ?? (await createThread({ userId, botId }));
    router.replace(`/chat/${threadId}`);
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/")}> 
          <Text style={styles.brand}>{user?.appName ?? "expo-demo"}</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Search bots and chats"
            style={styles.iconButton}
            onPress={() => router.push("/search")}
          >
            <MagnifyingGlass size={18} color={theme.colors.ink} />
          </Pressable>
          <Pressable
            accessibilityLabel="Settings"
            style={styles.iconButton}
            onPress={() => router.push("/settings")}
          >
            <GearSix size={18} color={theme.colors.ink} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={bots ?? []}
        keyExtractor={(b) => b._id}
        contentContainerStyle={{ paddingHorizontal: theme.space(2) }}
        renderItem={({ item }) => {
          const active = item._id === activeBotId;
          return (
            <Pressable
              style={[styles.row, active && styles.rowActive]}
              onPress={() => openBot(item._id)}
            >
              <BotAvatar
                name={item.name}
                color={item.color}
                size={36}
                avatarUrl={item.avatarUrl}
              />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowPurpose} numberOfLines={1}>
                  {item.purpose}
                </Text>
              </View>
              <Text style={styles.rowTime}>{relativeTime(item.lastActiveAt)}</Text>
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.newBot} onPress={() => router.push("/bot/new")}>
        <Plus size={16} color={theme.colors.onInk} weight="bold" />
        <Text style={styles.newBotText}>New bot</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 300,
    backgroundColor: theme.colors.paper,
    borderRightWidth: 1,
    borderRightColor: theme.colors.line,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(4),
  },
  brand: { color: theme.colors.ink, fontSize: 14, fontWeight: "400", ...theme.mono },
  headerActions: { flexDirection: "row", gap: theme.space(1.5) },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2.5),
    paddingVertical: theme.space(2.5),
    paddingHorizontal: theme.space(2.5),
    borderRadius: theme.radius.card,
  },
  rowActive: { backgroundColor: theme.colors.mist },
  rowBody: { flex: 1 },
  rowName: { color: theme.colors.ink, fontSize: 14, fontWeight: "500" },
  rowPurpose: { color: theme.colors.slate, fontSize: 12, marginTop: 1 },
  rowTime: { color: theme.colors.faint, fontSize: 11 },
  newBot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space(2),
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space(2.5),
    margin: theme.space(4),
  },
  newBotText: { color: theme.colors.onInk, fontWeight: "600", fontSize: 13 },
});
