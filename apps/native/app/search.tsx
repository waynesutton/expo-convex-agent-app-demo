import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useConvex, useMutation, useQuery } from "convex/react";
import { ChatCircle, MagnifyingGlass, X } from "phosphor-react-native";
import { api } from "@expo-demo/backend/convex/_generated/api";
import { Id } from "@expo-demo/backend/convex/_generated/dataModel";
import { BotAvatar } from "@/components/BotAvatar";
import { getDeviceId } from "@/lib/keys";
import { noFocusRing, theme } from "@/lib/theme";

// Workspace search over bot names, chat titles, and message content, backed
// by Convex full text search indexes (search.all). Results are reactive and
// the last term is prefix matched, so this works as-you-type.
// https://docs.convex.dev/search/text-search

export default function SearchScreen() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [term, setTerm] = useState("");
  const convexClient = useConvex();
  const ensureUser = useMutation(api.users.ensureUser);
  const createThread = useMutation(api.threads.create);

  const results = useQuery(
    api.search.all,
    userId && term.trim() !== "" ? { userId, query: term } : "skip"
  );

  useEffect(() => {
    (async () =>
      setUserId(await ensureUser({ deviceId: await getDeviceId() })))();
  }, []);

  // Bots resume their latest thread, the same gesture as the roster.
  const openBot = async (botId: Id<"bots">) => {
    if (!userId) return;
    const existing = await convexClient.query(api.threads.latestForBot, {
      botId,
    });
    const threadId = existing ?? (await createThread({ userId, botId }));
    router.replace(`/chat/${threadId}`);
  };

  const openThread = (threadId: Id<"threads">) =>
    router.replace(`/chat/${threadId}`);

  const searching = term.trim() !== "";
  const empty =
    searching &&
    results !== undefined &&
    results.bots.length === 0 &&
    results.threads.length === 0 &&
    results.messages.length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.inputWrap}>
        <MagnifyingGlass size={16} color={theme.colors.faint} />
        <TextInput
          style={[styles.input, noFocusRing]}
          value={term}
          onChangeText={setTerm}
          placeholder="Search bots and chats"
          placeholderTextColor={theme.colors.faint}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search bots and chats"
        />
        {term !== "" && (
          <Pressable accessibilityLabel="Clear search" onPress={() => setTerm("")}>
            <X size={16} color={theme.colors.slate} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.results}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
      >
        {!searching && (
          <View style={styles.hintBlock}>
            <Text style={styles.hintTitle}>Find anything you said</Text>
            <Text style={styles.hint}>
              Bots by name, chats by title, and messages by what's in them.
              Results update as you type, straight from Convex full text
              search.
            </Text>
          </View>
        )}

        {empty && (
          <View style={styles.hintBlock}>
            <Text style={styles.hintTitle}>No matches</Text>
            <Text style={styles.hint}>
              Try a shorter word. Search matches whole words plus the start
              of the last one.
            </Text>
          </View>
        )}

        {results && results.bots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Bots</Text>
            {results.bots.map((b) => (
              <Pressable
                key={b._id}
                style={styles.row}
                onPress={() => openBot(b._id)}
              >
                <BotAvatar
                  name={b.name}
                  color={b.color}
                  size={36}
                  avatarUrl={b.avatarUrl}
                />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {b.purpose}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {results && results.threads.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Chats</Text>
            {results.threads.map((t) => (
              <Pressable
                key={t._id}
                style={styles.row}
                onPress={() => openThread(t._id)}
              >
                <View style={styles.threadIcon}>
                  <ChatCircle size={18} color={theme.colors.slate} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {t.title}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {results && results.messages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Messages</Text>
            {results.messages.map((m) => (
              <Pressable
                key={m._id}
                style={styles.row}
                onPress={() => openThread(m.threadId)}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {m.threadTitle}
                  </Text>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {m.content}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.paper },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    backgroundColor: theme.colors.field,
    borderRadius: theme.radius.input,
    marginHorizontal: theme.space(4),
    marginTop: theme.space(4),
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(1),
    minHeight: 44,
  },
  input: { flex: 1, color: theme.colors.ink, fontSize: 15 },
  results: { flex: 1 },
  resultsContent: {
    padding: theme.space(4),
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  hintBlock: { paddingTop: theme.space(8), alignItems: "center" },
  hintTitle: { color: theme.colors.ink, fontSize: 15, fontWeight: "500" },
  hint: {
    color: theme.colors.slate,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: theme.space(2),
    maxWidth: 320,
  },
  section: { marginBottom: theme.space(4) },
  sectionLabel: {
    color: theme.colors.faint,
    fontSize: 11,
    ...theme.mono,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: theme.space(1),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    paddingVertical: theme.space(2.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.lineSoft,
  },
  rowBody: { flex: 1 },
  rowTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "500" },
  rowSub: { color: theme.colors.slate, fontSize: 12, marginTop: 1 },
  threadIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
});
