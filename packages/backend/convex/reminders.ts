import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Bot reminders. Each bot can carry one reminder (message + interval). The
// cron in convex/crons.ts calls sendDue every 5 minutes; due reminders land
// as an assistant message in the bot's latest thread plus a push. The global
// switch lives on the user (users.remindersEnabled, Settings screen).

const pushNotifications = new PushNotifications<Id<"users">>(
  components.pushNotifications
);

export const sendDue = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const bots = await ctx.db
      .query("bots")
      .withIndex("by_reminderEnabled", (q) => q.eq("reminderEnabled", true))
      .collect();

    for (const bot of bots) {
      const intervalMs = (bot.reminderMinutes ?? 60) * 60 * 1000;
      const last = bot.reminderLastSentAt ?? 0;
      if (now - last < intervalMs) continue;
      if (!bot.reminderMessage) continue;

      // Global switch: absent means on, false means every reminder is muted.
      const user = await ctx.db.get(bot.userId);
      if (!user || user.remindersEnabled === false) continue;

      // Post into the bot's latest thread, or open one if none exists.
      let thread = await ctx.db
        .query("threads")
        .withIndex("by_bot_recent", (q) => q.eq("botId", bot._id))
        .order("desc")
        .first();
      let threadId = thread?._id;
      if (!threadId) {
        threadId = await ctx.db.insert("threads", {
          userId: bot.userId,
          title: bot.name,
          lastMessageAt: now,
          botId: bot._id,
        });
      }

      await ctx.db.insert("messages", {
        threadId,
        userId: bot.userId,
        botId: bot._id,
        role: "assistant",
        content: `Reminder: ${bot.reminderMessage}`,
        status: "done",
      });
      await ctx.db.patch(threadId, { lastMessageAt: now });
      await ctx.db.patch(bot._id, { reminderLastSentAt: now });

      await pushNotifications.sendPushNotification(ctx, {
        userId: bot.userId,
        allowUnregisteredTokens: true,
        notification: {
          title: `${bot.name} reminder`,
          body: bot.reminderMessage,
          data: { threadId },
        },
      });
    }
    return null;
  },
});
