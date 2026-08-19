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
import { useMutation } from "convex/react";
import { api } from "@expo-demo/backend/convex/_generated/api";
import { Id } from "@expo-demo/backend/convex/_generated/dataModel";
import { BotAvatar } from "@/components/BotAvatar";
import { getDeviceId } from "@/lib/keys";
import { BOT_COLOR_KEYS, BOT_COLORS, noFocusRing, theme } from "@/lib/theme";

// Create a bot: name it, pick its identity color, give it a job. The job
// description becomes the bot's persona in the agent loop.
export default function NewBot() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(BOT_COLOR_KEYS[0]);
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const ensureUser = useMutation(api.users.ensureUser);
  const createBot = useMutation(api.bots.create);
  const createThread = useMutation(api.threads.create);

  useEffect(() => {
    (async () => setUserId(await ensureUser({ deviceId: await getDeviceId() })))();
  }, []);

  const canCreate = userId !== null && name.trim() !== "" && purpose.trim() !== "";

  const onCreate = async () => {
    if (!canCreate || busy || !userId) return;
    setBusy(true);
    try {
      const botId = await createBot({
        userId,
        name: name.trim(),
        color,
        purpose: purpose.trim(),
      });
      const threadId = await createThread({ userId, botId });
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
      <View style={styles.preview}>
        <BotAvatar name={name || "?"} color={color} size={72} />
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={[styles.input, noFocusRing]}
        value={name}
        onChangeText={setName}
        placeholder="Inbox Manager"
        placeholderTextColor={theme.colors.faint}
        autoFocus
        maxLength={40}
      />

      <Text style={styles.label}>Color</Text>
      <View style={styles.swatchRow}>
        {BOT_COLOR_KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityLabel={`Color ${key}`}
            onPress={() => setColor(key)}
            style={[
              styles.swatchWell,
              color === key && styles.swatchWellActive,
            ]}
          >
            <View style={[styles.swatch, { backgroundColor: BOT_COLORS[key] }]} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Job</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline, noFocusRing]}
        value={purpose}
        onChangeText={setPurpose}
        placeholder="Triage my inbox every morning, draft replies for anything urgent, and flag what needs my approval."
        placeholderTextColor={theme.colors.faint}
        multiline
      />
      <Text style={styles.hint}>
        This becomes the bot's persona. Be specific about what it owns.
      </Text>

      <Pressable
        style={[styles.create, !canCreate && styles.createDisabled]}
        onPress={onCreate}
        disabled={!canCreate || busy}
      >
        <Text style={styles.createText}>
          {busy ? "Creating..." : "Create bot"}
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
  content: { padding: theme.space(5), paddingBottom: theme.space(10) },
  preview: { alignItems: "center", marginBottom: theme.space(5) },
  label: {
    color: theme.colors.slate,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: theme.space(2),
    marginTop: theme.space(4),
  },
  input: {
    backgroundColor: theme.colors.field,
    borderRadius: theme.radius.card,
    color: theme.colors.ink,
    fontSize: 16,
    paddingHorizontal: theme.space(4),
    paddingVertical: theme.space(3),
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(2) },
  swatchWell: {
    padding: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchWellActive: { borderColor: theme.colors.ink },
  swatch: { width: 32, height: 32, borderRadius: theme.radius.pill },
  hint: { color: theme.colors.faint, fontSize: 12, marginTop: theme.space(2) },
  create: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space(3.5),
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
