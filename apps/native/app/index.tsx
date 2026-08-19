import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import { GearSix, MagnifyingGlass, Plus, UsersThree } from "phosphor-react-native";
import { api } from "@expo-demo/backend/convex/_generated/api";
import { Id } from "@expo-demo/backend/convex/_generated/dataModel";
import { BotAvatar } from "@/components/BotAvatar";
import { DemoBanner } from "@/components/DemoBanner";
import { getDeviceId } from "@/lib/keys";
import { registerForPush } from "@/lib/push";
import { relativeTime } from "@/lib/time";
import { theme } from "@/lib/theme";

// The bot roster. Bots are teammates: tap one to resume its conversation,
// the way you would open a DM. Creating a bot starts its first thread.
export default function BotRoster() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const convexClient = useConvex();
  const ensureUser = useMutation(api.users.ensureUser);
  const recordPushToken = useMutation(api.push.recordPushToken);
  const createThread = useMutation(api.threads.create);
  const bots = useQuery(api.bots.list, userId ? { userId } : "skip");
  const user = useQuery(api.users.get, userId ? { userId } : "skip");
  const demo = useQuery(api.demo.config);

  useEffect(() => {
    (async () => {
      const deviceId = await getDeviceId();
      const id = await ensureUser({ deviceId });
      setUserId(id);
      const token = await registerForPush();
      if (token) await recordPushToken({ userId: id, pushToken: token });
    })();
  }, []);

  // Resume the bot's latest thread, or start its first one.
  const openBot = async (botId: Id<"bots">) => {
    if (!userId) return;
    const existing = await convexClient.query(api.threads.latestForBot, { botId });
    const threadId = existing ?? (await createThread({ userId, botId }));
    router.push(`/chat/${threadId}`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>{user?.appName ?? "expo-demo"}</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Search bots and chats"
            style={styles.iconButton}
            onPress={() => router.push("/search")}
          >
            <MagnifyingGlass size={20} color={theme.colors.ink} />
          </Pressable>
          <Pressable
            accessibilityLabel="Settings"
            style={styles.iconButton}
            onPress={() => router.push("/settings")}
          >
            <GearSix size={20} color={theme.colors.ink} />
          </Pressable>
          {(bots?.length ?? 0) >= 2 && (
            <Pressable
              accessibilityLabel="New group chat"
              style={styles.iconButton}
              onPress={() => router.push("/group/new")}
            >
              <UsersThree size={20} color={theme.colors.ink} />
            </Pressable>
          )}
          <Pressable
            accessibilityLabel="New bot"
            style={[styles.iconButton, styles.iconButtonPrimary]}
            onPress={() => router.push("/bot/new")}
          >
            <Plus size={20} color={theme.colors.onInk} weight="bold" />
          </Pressable>
        </View>
      </View>

      {demo?.demoMode && (
        <DemoBanner text="Public demo: all chats are visible to others and reset every 5 minutes." />
      )}

      <FlatList
        data={bots ?? []}
        keyExtractor={(b) => b._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          bots === undefined ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Build your team</Text>
              <Text style={styles.emptyBody}>
                Give each bot a name and a job. Message them like coworkers,
                or put several in one thread and let them work together.
              </Text>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push("/bot/new")}
              >
                <Plus size={16} color={theme.colors.onInk} weight="bold" />
                <Text style={styles.emptyButtonText}>Create your first bot</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openBot(item._id)}>
            <BotAvatar
              name={item.name}
              color={item.color}
              size={52}
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
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space(5),
    paddingTop: theme.space(4),
    paddingBottom: theme.space(3),
  },
  brand: { color: theme.colors.ink, fontSize: 15, fontWeight: "400", ...theme.mono },
  headerActions: { flexDirection: "row", gap: theme.space(2) },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPrimary: { backgroundColor: theme.colors.ink },
  listContent: { paddingHorizontal: theme.space(3), paddingBottom: theme.space(6) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(2),
    borderRadius: theme.radius.card,
  },
  rowBody: { flex: 1 },
  rowName: { color: theme.colors.ink, fontSize: 16, fontWeight: "500" },
  rowPurpose: { color: theme.colors.slate, fontSize: 13, marginTop: 2 },
  rowTime: { color: theme.colors.faint, fontSize: 12 },
  empty: {
    alignItems: "center",
    paddingHorizontal: theme.space(8),
    paddingTop: theme.space(20),
  },
  emptyTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: "500" },
  emptyBody: {
    color: theme.colors.slate,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: theme.space(2),
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space(3),
    paddingHorizontal: theme.space(5),
    marginTop: theme.space(5),
  },
  emptyButtonText: { color: theme.colors.onInk, fontWeight: "600", fontSize: 14 },
});
