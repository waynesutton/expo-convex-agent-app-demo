import { Image, StyleSheet, Text, View } from "react-native";
import { botColor, botInitialColor } from "@/lib/theme";

// The bot identity blob: a colored squircle carrying the bot's initial, or
// the bot's uploaded PNG when one is set (Convex file storage, under 2 MB).
// It is the signature element of the app and appears everywhere a bot does:
// roster, sidebar, chat header, and beside every bot message.
export function BotAvatar({
  name,
  color,
  size = 44,
  avatarUrl,
}: {
  name: string;
  color: string;
  size?: number;
  avatarUrl?: string | null;
}) {
  const radius = size * 0.38;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        accessibilityLabel={`${name} avatar`}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: botColor(color),
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          { fontSize: size * 0.42, color: botInitialColor(color) },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { alignItems: "center", justifyContent: "center" },
  initial: { fontWeight: "600" },
});
