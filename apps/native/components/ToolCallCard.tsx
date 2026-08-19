import { StyleSheet, Text, View } from "react-native";
import { theme } from "@/lib/theme";

// The agent shows its work: tool calls render as quiet mono cards inside the
// bot's bubble. Light surface, monospace, no decoration. See docs/design.md.
export function ToolCallCard({
  call,
}: {
  call: { name: string; input: string; output?: string; status: string };
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>
        {call.name} {call.status === "running" ? "..." : ""}
      </Text>
      <Text style={styles.body} numberOfLines={3}>
        in  {call.input}
      </Text>
      {call.output !== undefined && (
        <Text
          style={[styles.body, call.status === "error" && styles.error]}
          numberOfLines={6}
        >
          out {call.output}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.paper,
    borderColor: theme.colors.line,
    borderWidth: 1,
    borderRadius: theme.radius.card - 4,
    padding: theme.space(3),
    marginBottom: theme.space(2),
  },
  name: {
    color: theme.colors.ink,
    ...theme.mono,
    fontSize: 12,
    marginBottom: theme.space(1),
  },
  body: { color: theme.colors.slate, ...theme.mono, fontSize: 11, lineHeight: 16 },
  error: { color: theme.colors.signal },
});
