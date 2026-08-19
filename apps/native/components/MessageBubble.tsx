import { Image, StyleSheet, Text, View } from "react-native";
import { BotAvatar } from "@/components/BotAvatar";
import { ThinkingDots } from "@/components/ThinkingDots";
import { ToolCallCard } from "@/components/ToolCallCard";
import { theme } from "@/lib/theme";

type ToolCall = {
  name: string;
  input: string;
  output?: string;
  status: "running" | "done" | "error";
};

type Message = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "error";
  toolCalls?: ToolCall[];
  attachmentUrls: string[];
  // Bot author, resolved by messages.list. Null for user messages and for
  // messages from bots that were later deleted.
  bot?: { name: string; color: string; avatarUrl?: string | null } | null;
};

// User messages are ink bubbles on the right; bot messages sit on the left
// beside the bot's identity blob, in mist.
export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  const bubble = (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
      {message.attachmentUrls.map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.image} />
      ))}
      {message.toolCalls?.map((call, i) => (
        <ToolCallCard key={i} call={call} />
      ))}
      {message.content !== "" && (
        <Text style={isUser ? styles.textUser : styles.textBot}>
          {/* @tokens render semibold so mentions read as mentions. */}
          {message.content.split(/(@[\w][\w-]*)/g).map((part, i) =>
            part.startsWith("@") ? (
              <Text key={i} style={styles.mention}>
                {part}
              </Text>
            ) : (
              part
            )
          )}
        </Text>
      )}
      {message.status === "streaming" && <ThinkingDots />}
    </View>
  );

  if (isUser) {
    return <View style={styles.rowUser}>{bubble}</View>;
  }

  return (
    <View style={styles.rowBot}>
      <BotAvatar
        name={message.bot?.name ?? "Bot"}
        color={message.bot?.color ?? ""}
        size={28}
        avatarUrl={message.bot?.avatarUrl}
      />
      <View style={styles.botColumn}>
        {message.bot && <Text style={styles.botName}>{message.bot.name}</Text>}
        {bubble}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowUser: {
    alignItems: "flex-end",
    marginBottom: theme.space(3),
  },
  rowBot: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.space(2),
    marginBottom: theme.space(3),
    maxWidth: "92%",
  },
  botColumn: { flexShrink: 1 },
  botName: {
    color: theme.colors.faint,
    fontSize: 11,
    fontWeight: "500",
    marginBottom: theme.space(1),
    marginLeft: theme.space(1),
  },
  bubble: {
    borderRadius: theme.radius.bubble,
    paddingVertical: theme.space(2.5),
    paddingHorizontal: theme.space(3.5),
  },
  bubbleUser: {
    backgroundColor: theme.colors.ink,
    maxWidth: "82%",
    borderBottomRightRadius: 6,
  },
  bubbleBot: {
    backgroundColor: theme.colors.mist,
    borderBottomLeftRadius: 6,
  },
  textUser: { color: theme.colors.onInk, fontSize: 15, lineHeight: 22 },
  textBot: { color: theme.colors.ink, fontSize: 15, lineHeight: 22 },
  mention: { fontWeight: "600" },
  image: {
    width: 200,
    height: 200,
    borderRadius: theme.radius.card,
    marginBottom: theme.space(2),
  },
});
