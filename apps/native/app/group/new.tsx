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
import { useMutation, useQuery } from "convex/react";
import { Check } from "phosphor-react-native";
import { api } from "@expo-demo/backend/convex/_generated/api";
import { Id } from "@expo-demo/backend/convex/_generated/dataModel";
import { BotAvatar } from "@/components/BotAvatar";
import { getDeviceId } from "@/lib/keys";
import { noFocusRing, theme } from "@/lib/theme";

// Group chat: pick two or more bots and drop them into one thread. Every
// bot in the group reads the conversation so far, including each other's
// replies, and responds in turn. Use @name to hand a message to one bot.
export default function NewGroup() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const ensureUser = useMutation(api.users.ensureUser);
  const createGroup = useMutation(api.threads.createGroup);
  const bots = useQuery(api.bots.list, userId ? { userId } : "skip");

  useEffect(() => {
    (async () => setUserId(await ensureUser({ deviceId: await getDeviceId() })))();
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canCreate = userId !== null && selected.size >= 2;

  const onCreate = async () => {
    if (!canCreate || busy || !userId) return;
    setBusy(true);
    try {
      const threadId = await createGroup({
        userId,
        botIds: Array.from(selected) as Id<"bots">[],
        title: title.trim() || undefined,
      });
      router.replace(`/chat/${threadId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.hint}>
        Pick at least two bots. They see each other's replies and coordinate.
        Mention @name in a message to route it to one of them.
      </Text>

      {(bots ?? []).map((bot) => {
        const isSelected = selected.has(bot._id);
        return (
          <Pressable
            key={bot._id}
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => toggle(bot._id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <BotAvatar name={bot.name} color={bot.color} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{bot.name}</Text>
              <Text style={styles.purpose} numberOfLines={1}>
                {bot.purpose}
              </Text>
            </View>
            <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
              {isSelected && <Check size={14} color={theme.colors.onInk} weight="bold" />}
            </View>
          </Pressable>
        );
      })}

      {bots && bots.length < 2 && (
        <Text style={styles.hint}>
          You need at least two bots for a group. Create another from the home
          screen first.
        </Text>
      )}

      <Text style={styles.label}>Group name (optional)</Text>
      <TextInput
        style={[styles.input, noFocusRing]}
        value={title}
        onChangeText={setTitle}
        placeholder="Defaults to the bot names"
        placeholderTextColor={theme.colors.faint}
      />

      <Pressable
        style={[styles.create, !canCreate && styles.createDisabled]}
        onPress={onCreate}
        disabled={!canCreate || busy}
      >
        <Text style={styles.createText}>
          {busy ? "Creating..." : `Start group chat${selected.size >= 2 ? ` (${selected.size})` : ""}`}
        </Text>
      </Pressable>

      <Pressable style={styles.cancel} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.paper },
  content: { padding: theme.space(4), paddingBottom: theme.space(10) },
  hint: {
    color: theme.colors.slate,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: theme.space(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    padding: theme.space(3),
    borderRadius: theme.radius.card,
    marginBottom: theme.space(2),
  },
  rowSelected: { backgroundColor: theme.colors.mist },
  name: { color: theme.colors.ink, fontSize: 15, fontWeight: "500" },
  purpose: { color: theme.colors.slate, fontSize: 12, marginTop: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  label: {
    color: theme.colors.slate,
    fontSize: 13,
    fontWeight: "500",
    marginTop: theme.space(4),
    marginBottom: theme.space(2),
  },
  input: {
    backgroundColor: theme.colors.field,
    borderRadius: theme.radius.card,
    color: theme.colors.ink,
    padding: theme.space(3),
  },
  create: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.pill,
    padding: theme.space(3.5),
    alignItems: "center",
    marginTop: theme.space(6),
  },
  createDisabled: { opacity: 0.35 },
  createText: { color: theme.colors.onInk, fontWeight: "600", fontSize: 15 },
  cancel: {
    alignItems: "center",
    paddingVertical: theme.space(3),
    marginTop: theme.space(2),
  },
  cancelText: { color: theme.colors.slate, fontSize: 14 },
});
