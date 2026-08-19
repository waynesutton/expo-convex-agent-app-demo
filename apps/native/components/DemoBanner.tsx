import { StyleSheet, Text, View } from "react-native";
import { ArrowCounterClockwise } from "phosphor-react-native";
import { theme } from "@/lib/theme";

// Quiet notice above demo content. A Convex cron rewrites the seeded demo
// chats every 5 minutes (packages/backend/convex/crons.ts); this banner keeps
// that honest so nobody wonders where their test message went. The landing
// page carries the same line.
export function DemoBanner({ text }: { text?: string }) {
  return (
    <View style={styles.banner}>
      <ArrowCounterClockwise size={13} color={theme.colors.slate} />
      <Text style={styles.text}>
        {text ?? "Demo chats reset every 5 minutes."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(1.5),
    backgroundColor: theme.colors.mist,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space(2),
    paddingHorizontal: theme.space(3),
    marginHorizontal: theme.space(2),
    marginBottom: theme.space(2),
  },
  text: { color: theme.colors.slate, fontSize: 12, flex: 1 },
});
