import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is not set. Copy .env.example to .env.local and paste the URL printed by `npx convex dev`."
  );
}

export const convex = new ConvexReactClient(url, {
  // React Native has no browser websocket keepalive; this is the documented
  // setting for Expo apps.
  unsavedChangesWarning: false,
});
