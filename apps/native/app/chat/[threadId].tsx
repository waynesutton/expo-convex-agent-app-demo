import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { GearSix, UserPlus, X } from "phosphor-react-native";
import { api } from "@expo-demo/backend/convex/_generated/api";
import { Id } from "@expo-demo/backend/convex/_generated/dataModel";
import { BotAvatar } from "@/components/BotAvatar";
import { BotSidebar } from "@/components/BotSidebar";
import { Composer } from "@/components/Composer";
import { DemoBanner } from "@/components/DemoBanner";
import { MessageBubble } from "@/components/MessageBubble";
import { getApiKey, getDeviceId, getProvider } from "@/lib/keys";
import { parseMentions } from "@/lib/mentions";
import { theme } from "@/lib/theme";

// Sidebar appears at this width: desktop web via Expo, mobile stays full bleed.
const DESKTOP_BREAKPOINT = 900;

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const tid = threadId as Id<"threads">;
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  // User-facing send blockers: missing key, moderation, or rate limit.
  const [notice, setNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const demo = useQuery(api.demo.config);
  const user = useMutation(api.users.ensureUser);
  const send = useMutation(api.messages.send);
  const addBot = useMutation(api.threads.addBot);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const runAgent = useAction(api.agent.runAgent);
  const messages = useQuery(api.messages.list, { threadId: tid });
  const thread = useQuery(api.threads.get, { threadId: tid });
  const allBots = useQuery(api.bots.list, userId ? { userId } : "skip");

  useEffect(() => {
    (async () => setUserId(await user({ deviceId: await getDeviceId() })))();
  }, []);

  const threadBots = thread?.bots ?? [];
  const primaryBot = threadBots[0];
  // Bots not yet in this thread, offered by the teammate picker.
  const availableBots = (allBots ?? []).filter(
    (b) => !threadBots.some((tb) => tb._id === b._id)
  );

  const onAddBot = async (botId: Id<"bots">) => {
    setPickerOpen(false);
    await addBot({ threadId: tid, botId });
  };

  const onSend = async (text: string, imageUri: string | null) => {
    if (!userId) return false;

    // Demo mode: the backend holds the key (docs/demo-mode.md). Without a
    // server key, live replies are off and we say so instead of failing.
    const demoMode = demo?.demoMode === true;
    if (demoMode && demo?.chatEnabled === false) {
      setNotice(
        "Live replies are off in this public demo. Fork the template and bring your own keys to chat."
      );
      return false;
    }

    // BYOK: read the key from secure store per send. It rides the action
    // call and is never persisted anywhere. See docs/byok.md. Skipped in
    // demo mode, where the backend uses the host's server key instead.
    const provider = await getProvider();
    const apiKey = demoMode ? null : await getApiKey(provider);
    if (!demoMode && !apiKey) {
      setNotice("No API key for your selected provider. Add one in Settings.");
      return false;
    }
    setNotice(null);

    let attachments: Id<"_storage">[] | undefined;
    if (imageUri) {
      const uploadUrl = await generateUploadUrl();
      const blob = await (await fetch(imageUri)).blob();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      const { storageId } = await result.json();
      attachments = [storageId];
    }

    // @mentions route the run. Mentioned bots (thread members or not) respond
    // in mention order; anyone new joins the thread first. No mentions means
    // every thread bot responds, as before.
    const mentioned = parseMentions(text, allBots ?? []);
    for (const bot of mentioned) {
      if (!threadBots.some((tb) => tb._id === bot._id)) {
        await addBot({ threadId: tid, botId: bot._id });
      }
    }
    const responderIds =
      mentioned.length > 0
        ? mentioned.map((b) => b._id)
        : threadBots.map((b) => b._id);

    // Moderation lives server side (packages/backend/convex/messages.ts).
    // A blocked message throws a ConvexError with copy meant for the user;
    // the composer keeps the draft so nothing is lost.
    try {
      await send({ threadId: tid, userId, content: text, attachments });
    } catch (err) {
      setNotice(
        err instanceof ConvexError && typeof err.data === "string"
          ? err.data
          : "Message not sent. Try again."
      );
      return false;
    }
    await runAgent({
      threadId: tid,
      userId,
      provider,
      // In demo mode the backend swaps in its own key and provider.
      apiKey: apiKey ?? undefined,
      botIds: responderIds,
    });
    return true;
  };

  const chatColumn = (
    <KeyboardAvoidingView
      style={styles.chat}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {demo?.demoMode ? (
        <DemoBanner text="All chats in this demo are public and reset every 5 minutes." />
      ) : (
        thread?.isDemo && <DemoBanner />
      )}
      <FlatList
        data={messages ?? []}
        keyExtractor={(m) => m._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />
      {notice && <Text style={styles.warn}>{notice}</Text>}
      <Composer
        onSend={onSend}
        mentionables={allBots ?? []}
        allowAttachments={demo?.demoMode !== true}
        placeholder={
          primaryBot ? `Message ${primaryBot.name}` : "Message your agent"
        }
      />
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitle}>
              {primaryBot && (
                <BotAvatar
                  name={primaryBot.name}
                  color={primaryBot.color}
                  size={28}
                  avatarUrl={primaryBot.avatarUrl}
                />
              )}
              <Text style={styles.headerText} numberOfLines={1}>
                {thread?.title ?? ""}
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {availableBots.length > 0 && (
                <Pressable
                  accessibilityLabel="Add a bot to this thread"
                  style={styles.headerAction}
                  onPress={() => setPickerOpen((v) => !v)}
                >
                  <UserPlus size={20} color={theme.colors.ink} />
                </Pressable>
              )}
              {primaryBot && (
                <Pressable
                  accessibilityLabel="Bot settings"
                  style={styles.headerAction}
                  onPress={() => router.push(`/bot/${primaryBot._id}`)}
                >
                  <GearSix size={20} color={theme.colors.ink} />
                </Pressable>
              )}
            </View>
          ),
        }}
      />

      <View style={styles.body}>
        {isDesktop && userId && (
          <BotSidebar userId={userId} activeBotId={thread?.botId} />
        )}
        {chatColumn}
      </View>

      {pickerOpen && (
        <View style={styles.picker}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Add a teammate</Text>
            <Pressable
              accessibilityLabel="Close"
              onPress={() => setPickerOpen(false)}
            >
              <X size={18} color={theme.colors.slate} />
            </Pressable>
          </View>
          <Text style={styles.pickerHint}>
            Bots in this thread read each other's replies and coordinate. Type
            @name in a message to hand it to one bot.
          </Text>
          {availableBots.map((b) => (
            <Pressable
              key={b._id}
              style={styles.pickerRow}
              onPress={() => onAddBot(b._id)}
            >
              <BotAvatar
                name={b.name}
                color={b.color}
                size={32}
                avatarUrl={b.avatarUrl}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerName}>{b.name}</Text>
                <Text style={styles.pickerPurpose} numberOfLines={1}>
                  {b.purpose}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.paper },
  body: { flex: 1, flexDirection: "row" },
  chat: { flex: 1, backgroundColor: theme.colors.paper },
  listContent: { padding: theme.space(4), maxWidth: 760, width: "100%", alignSelf: "center" },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: theme.space(2) },
  headerText: { color: theme.colors.ink, fontSize: 16, fontWeight: "500", maxWidth: 220 },
  headerActions: { flexDirection: "row", gap: theme.space(2) },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  warn: {
    color: theme.colors.signal,
    paddingHorizontal: theme.space(4),
    paddingBottom: theme.space(2),
    textAlign: "center",
  },
  picker: {
    position: "absolute",
    top: theme.space(2),
    right: theme.space(3),
    width: 300,
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    padding: theme.space(3),
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  pickerHint: {
    color: theme.colors.faint,
    fontSize: 12,
    marginTop: theme.space(1),
    marginBottom: theme.space(2),
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2.5),
    paddingVertical: theme.space(2),
  },
  pickerName: { color: theme.colors.ink, fontSize: 14, fontWeight: "500" },
  pickerPurpose: { color: theme.colors.slate, fontSize: 12 },
});
