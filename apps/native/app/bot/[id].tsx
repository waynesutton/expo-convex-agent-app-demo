import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { api } from "@expo-demo/backend/convex/_generated/api";
import { Id } from "@expo-demo/backend/convex/_generated/dataModel";
import { BotAvatar } from "@/components/BotAvatar";
import { noFocusRing, theme } from "@/lib/theme";

// Avatar uploads cap at 2 MB; the server enforces the same limit.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// Bot settings: reminder schedule, saved memory, imported skills, delete.
// Reminders ride the 5 minute cron in packages/backend/convex/crons.ts.

const INTERVALS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 240 },
  { label: "Daily", minutes: 1440 },
];

export default function BotSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const botId = id as Id<"bots">;
  const bot = useQuery(api.bots.get, { botId });
  const skills = useQuery(api.skills.listForBot, { botId });
  const demo = useQuery(api.demo.config);
  const setReminder = useMutation(api.bots.setReminder);
  const clearMemory = useMutation(api.bots.clearMemory);
  const removeBot = useMutation(api.bots.remove);
  const removeSkill = useMutation(api.skills.remove);
  const setAvatar = useMutation(api.bots.setAvatar);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadedMessage, setLoadedMessage] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Seed the reminder message input once the bot loads.
  useEffect(() => {
    if (bot && !loadedMessage) {
      setMessage(bot.reminderMessage ?? "");
      setLoadedMessage(true);
    }
  }, [bot, loadedMessage]);

  if (bot === undefined) return <View style={styles.screen} />;
  if (bot === null) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.note}>This bot no longer exists.</Text>
      </View>
    );
  }

  const enabled = bot.reminderEnabled ?? false;
  const minutes = bot.reminderMinutes ?? 60;

  const onToggle = (value: boolean) => {
    void setReminder({
      botId,
      enabled: value,
      message: message.trim() || undefined,
    });
  };

  const onInterval = (m: number) =>
    setReminder({ botId, enabled, intervalMinutes: m });

  const onSaveMessage = () =>
    setReminder({ botId, enabled, message: message.trim() });

  // Pick a PNG, check type and size on device, upload to Convex file
  // storage, then attach it. The server re-validates both rules.
  const onPickAvatar = async () => {
    setAvatarError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAvatarBusy(true);
    try {
      const blob = await (await fetch(asset.uri)).blob();
      const mime = asset.mimeType ?? blob.type;
      const looksPng =
        mime === "image/png" || asset.uri.toLowerCase().endsWith(".png");
      if (!looksPng) {
        setAvatarError("Choose a PNG image.");
        return;
      }
      if (blob.size > MAX_AVATAR_BYTES) {
        setAvatarError("That file is over 2 MB. Pick a smaller PNG.");
        return;
      }
      const uploadUrl = await generateUploadUrl();
      const upload = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });
      const { storageId } = await upload.json();
      await setAvatar({ botId, storageId });
    } catch {
      setAvatarError("Upload failed. Try again.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await removeBot({ botId });
    router.dismissAll();
    router.replace("/");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <BotAvatar
          name={bot.name}
          color={bot.color}
          size={56}
          avatarUrl={bot.avatarUrl}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{bot.name}</Text>
          <Text style={styles.purpose} numberOfLines={2}>
            {bot.purpose}
          </Text>
          {/* The public demo is text only; the backend refuses uploads too. */}
          {demo?.demoMode !== true && (
            <View style={styles.avatarActions}>
              <Pressable
                accessibilityLabel="Upload avatar"
                onPress={onPickAvatar}
                disabled={avatarBusy}
              >
                <Text style={[styles.avatarLink, avatarBusy && styles.dim]}>
                  {avatarBusy
                    ? "Uploading"
                    : bot.avatarUrl
                      ? "Replace photo"
                      : "Upload photo"}
                </Text>
              </Pressable>
              {bot.avatarUrl && !avatarBusy ? (
                <Pressable
                  accessibilityLabel="Remove avatar"
                  onPress={() => {
                    setAvatarError(null);
                    void setAvatar({ botId, storageId: null });
                  }}
                >
                  <Text style={styles.avatarRemove}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </View>
      {avatarError ? (
        <Text style={styles.avatarErrorText}>{avatarError}</Text>
      ) : demo?.demoMode === true ? (
        <Text style={styles.avatarHint}>
          Photo uploads are off in this public demo. Fork the template to
          enable avatars.
        </Text>
      ) : (
        <Text style={styles.avatarHint}>
          PNG under 2 MB, stored with Convex file storage.
        </Text>
      )}

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Reminder</Text>
          <Switch
            value={enabled}
            onValueChange={onToggle}
            trackColor={{ true: theme.colors.ink, false: theme.colors.field }}
            thumbColor={theme.colors.paper}
          />
        </View>
        <Text style={styles.note}>
          A Convex cron checks every 5 minutes and sends this as a push
          notification into the bot's chat when due.
        </Text>
        {enabled && (
          <>
            <View style={styles.chipRow}>
              {INTERVALS.map((opt) => (
                <Pressable
                  key={opt.minutes}
                  onPress={() => onInterval(opt.minutes)}
                  style={[styles.chip, minutes === opt.minutes && styles.chipActive]}
                >
                  <Text
                    style={
                      minutes === opt.minutes ? styles.chipTextActive : styles.chipText
                    }
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, noFocusRing]}
              value={message}
              onChangeText={setMessage}
              onBlur={onSaveMessage}
              placeholder="What should this bot remind you about?"
              placeholderTextColor={theme.colors.faint}
              multiline
            />
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Memory</Text>
          {bot.memory ? (
            <Pressable onPress={() => clearMemory({ botId })}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        {bot.memory ? (
          <Text style={styles.memory}>{bot.memory}</Text>
        ) : (
          <Text style={styles.note}>
            Nothing saved yet. In chat, ask the bot to remember something and
            it lands here.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        {skills && skills.length > 0 ? (
          skills.map((skill) => (
            <View key={skill._id} style={styles.skillRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.skillName}>{skill.name}</Text>
                {skill.sourceUrl ? (
                  <Text style={styles.skillSource} numberOfLines={1}>
                    {skill.sourceUrl}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => removeSkill({ skillId: skill._id })}>
                <Text style={styles.clearText}>Remove</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.note}>
            Paste a link or a block of instructions in chat and ask the bot to
            save it as a skill.
          </Text>
        )}
      </View>

      <Pressable
        style={[styles.delete, confirmDelete && styles.deleteConfirm]}
        onPress={onDelete}
      >
        <Text style={[styles.deleteText, confirmDelete && styles.deleteTextConfirm]}>
          {confirmDelete ? "Tap again to delete everything" : "Delete bot"}
        </Text>
      </Pressable>
      <Text style={styles.deleteNote}>
        Deleting removes the bot, its chats, and its skills.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.paper },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: theme.space(4), paddingBottom: theme.space(10) },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    marginBottom: theme.space(5),
  },
  name: { color: theme.colors.ink, fontSize: 17, fontWeight: "500" },
  purpose: { color: theme.colors.slate, fontSize: 13, marginTop: 2 },
  avatarActions: {
    flexDirection: "row",
    gap: theme.space(3),
    marginTop: theme.space(1.5),
  },
  avatarLink: { color: theme.colors.ink, fontSize: 13, fontWeight: "500" },
  avatarRemove: { color: theme.colors.slate, fontSize: 13 },
  dim: { opacity: 0.4 },
  avatarHint: {
    color: theme.colors.faint,
    fontSize: 12,
    marginTop: -theme.space(3),
    marginBottom: theme.space(4),
  },
  avatarErrorText: {
    color: theme.colors.signal,
    fontSize: 12,
    marginTop: -theme.space(3),
    marginBottom: theme.space(4),
  },
  section: {
    backgroundColor: theme.colors.mist,
    borderRadius: theme.radius.card,
    padding: theme.space(3.5),
    marginBottom: theme.space(3),
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  note: {
    color: theme.colors.slate,
    fontSize: 13,
    lineHeight: 19,
    marginTop: theme.space(2),
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space(2),
    marginTop: theme.space(3),
  },
  chip: {
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space(1.5),
    paddingHorizontal: theme.space(3),
  },
  chipActive: { backgroundColor: theme.colors.ink },
  chipText: { color: theme.colors.ink, fontSize: 13 },
  chipTextActive: { color: theme.colors.onInk, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: theme.colors.field,
    borderRadius: theme.radius.card,
    color: theme.colors.ink,
    padding: theme.space(3),
    marginTop: theme.space(3),
    minHeight: 60,
  },
  memory: {
    color: theme.colors.ink,
    fontSize: 13,
    lineHeight: 20,
    marginTop: theme.space(2),
  },
  clearText: { color: theme.colors.signal, fontSize: 13, fontWeight: "500" },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    paddingVertical: theme.space(2.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.line,
  },
  skillName: { color: theme.colors.ink, fontSize: 13, fontWeight: "500" },
  skillSource: { color: theme.colors.faint, fontSize: 11, marginTop: 1 },
  delete: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space(3),
    marginTop: theme.space(4),
    backgroundColor: theme.colors.mist,
  },
  deleteConfirm: { backgroundColor: theme.colors.signal },
  deleteText: { color: theme.colors.signal, fontSize: 14, fontWeight: "600" },
  deleteTextConfirm: { color: theme.colors.onInk },
  deleteNote: {
    color: theme.colors.faint,
    fontSize: 12,
    textAlign: "center",
    marginTop: theme.space(2),
  },
});
