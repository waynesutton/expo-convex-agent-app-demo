import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { PaperPlaneRight, Plus, X } from "phosphor-react-native";
import { BotAvatar } from "@/components/BotAvatar";
import { activeMentionQuery, insertMention } from "@/lib/mentions";
import { noFocusRing, theme } from "@/lib/theme";

export function Composer({
  onSend,
  placeholder = "Message your agent",
  mentionables = [],
  allowAttachments = true,
}: {
  // Resolve true when the message was accepted, false when it was blocked
  // (missing API key). Blocked sends keep the draft so nothing is lost.
  onSend: (text: string, imageUri: string | null) => Promise<boolean>;
  placeholder?: string;
  // Bots offered by the @ autocomplete. Empty list disables it.
  mentionables?: Array<{
    _id: string;
    name: string;
    color: string;
    avatarUrl?: string | null;
  }>;
  // False hides the photo attach button (the public demo is text only; the
  // backend refuses uploads there too). Forks keep the default.
  allowAttachments?: boolean;
}) {
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Trailing "@query" token, if the user is typing a mention right now.
  const mentionQuery = activeMentionQuery(text);
  const suggestions =
    mentionQuery === null
      ? []
      : mentionables
          .filter((b) =>
            b.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
          )
          .slice(0, 5);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (busy || (text.trim() === "" && !imageUri)) return;
    setBusy(true);
    try {
      const accepted = await onSend(text.trim(), imageUri);
      if (accepted) {
        setText("");
        setImageUri(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const canSend = !busy && (text.trim() !== "" || imageUri !== null);

  return (
    <View style={styles.bar}>
      {suggestions.length > 0 && (
        <View style={styles.mentionStrip}>
          {suggestions.map((b) => (
            <Pressable
              key={b._id}
              accessibilityLabel={`Mention ${b.name}`}
              style={styles.mentionRow}
              onPress={() => setText(insertMention(text, b.name))}
            >
              <BotAvatar
                name={b.name}
                color={b.color}
                size={24}
                avatarUrl={b.avatarUrl}
              />
              <Text style={styles.mentionName}>{b.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {imageUri && (
        <View style={styles.attachmentStrip}>
          <Image source={{ uri: imageUri }} style={styles.attachmentThumb} />
          <Pressable
            accessibilityLabel="Remove attached image"
            style={styles.attachmentRemove}
            onPress={() => setImageUri(null)}
          >
            <X size={12} color={theme.colors.onInk} weight="bold" />
          </Pressable>
        </View>
      )}
      <View style={styles.pill}>
        {allowAttachments && (
          <Pressable
            accessibilityLabel="Attach image"
            onPress={pickImage}
            style={styles.attach}
          >
            <Plus size={18} color={theme.colors.slate} weight="bold" />
          </Pressable>
        )}
        <TextInput
          style={[styles.input, noFocusRing]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.faint}
          multiline
        />
        <Pressable
          accessibilityLabel="Send"
          onPress={submit}
          style={[styles.send, !canSend && styles.sendDisabled]}
          disabled={!canSend}
        >
          <PaperPlaneRight size={16} color={theme.colors.onInk} weight="fill" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    padding: theme.space(3),
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  mentionStrip: {
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.line,
    marginBottom: theme.space(2),
    paddingVertical: theme.space(1),
    shadowColor: theme.colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2),
    paddingVertical: theme.space(1.5),
    paddingHorizontal: theme.space(3),
  },
  mentionName: { color: theme.colors.ink, fontSize: 14, fontWeight: "500" },
  pill: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: theme.colors.field,
    borderRadius: theme.radius.input,
    paddingHorizontal: theme.space(2),
    paddingVertical: theme.space(1.5),
    gap: theme.space(1.5),
  },
  attach: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentStrip: {
    flexDirection: "row",
    marginBottom: theme.space(2),
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.field,
  },
  attachmentRemove: {
    position: "absolute",
    top: -6,
    left: 44,
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 15,
    paddingVertical: theme.space(2),
    maxHeight: 120,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.25 },
});
