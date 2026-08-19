import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ConvexProvider } from "convex/react";
import { convex } from "@/lib/convex";
import { wireNotificationTaps } from "@/lib/push";
import { theme } from "@/lib/theme";

export default function RootLayout() {
  useEffect(() => {
    const sub = wireNotificationTaps();
    return () => sub.remove();
  }, []);

  return (
    <ConvexProvider client={convex}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.paper },
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { color: theme.colors.ink },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.paper },
        }}
      >
        {/* Roster draws its own header: brand left, settings and new bot right. */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[threadId]" options={{ title: "" }} />
        <Stack.Screen
          name="bot/new"
          options={{ title: "New bot", presentation: "modal" }}
        />
        <Stack.Screen
          name="bot/[id]"
          options={{ title: "Bot settings", presentation: "modal" }}
        />
        <Stack.Screen
          name="group/new"
          options={{ title: "New group chat", presentation: "modal" }}
        />
        <Stack.Screen
          name="search"
          options={{ title: "Search", presentation: "modal" }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: "Settings", presentation: "modal" }}
        />
        <Stack.Screen
          name="about"
          options={{ title: "About", presentation: "modal" }}
        />
      </Stack>
    </ConvexProvider>
  );
}
