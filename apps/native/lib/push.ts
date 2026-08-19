import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

// Registers this device for push and returns the Expo push token, or null if
// the user declined. Requires a development build; Expo Go will not deliver
// push on Android. See docs/push-notifications.md.
export async function registerForPush(): Promise<string | null> {
  // Expo push tokens are native only. Web preview skips push entirely.
  if (Platform.OS === "web") return null;
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

// Tap a "run finished" notification, land in the thread.
export function wireNotificationTaps() {
  if (Platform.OS === "web") {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const threadId = response.notification.request.content.data?.threadId;
    if (typeof threadId === "string") {
      router.push(`/chat/${threadId}`);
    }
  });
}
