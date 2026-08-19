import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Official Convex component for Expo push. It batches, retries, tracks
// receipts, and prunes dead tokens. Docs:
// https://www.convex.dev/components/push-notifications
const pushNotifications = new PushNotifications<Id<"users">>(
  components.pushNotifications
);

// Called from the app after permission is granted and a token is fetched.
export const recordPushToken = mutation({
  args: { userId: v.id("users"), pushToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await pushNotifications.recordToken(ctx, {
      userId: args.userId,
      pushToken: args.pushToken,
    });
    await ctx.db.patch(args.userId, { pushEnabled: true });
  },
});

// Fired at the end of every agent run. allowUnregisteredTokens makes this a
// silent no-op for users who never granted push permission, so it is safe to
// call unconditionally. Since component 0.3 the default is to throw instead.
export const notifyRunFinished = internalMutation({
  args: { userId: v.id("users"), threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    await pushNotifications.sendPushNotification(ctx, {
      userId: args.userId,
      allowUnregisteredTokens: true,
      notification: {
        title: "Agent run finished",
        body: thread ? thread.title : "Open expo-demo to see the result",
        data: { threadId: args.threadId },
      },
    });
  },
});

// Manual test hook: npx convex run push:sendTest '{"deviceId": "..."}'
export const sendTest = mutation({
  args: { deviceId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    if (!user) throw new Error("No user for that deviceId");
    await pushNotifications.sendPushNotification(ctx, {
      userId: user._id,
      notification: { title: "expo-demo test", body: "Push works." },
    });
  },
});
