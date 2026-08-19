import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { checkText, isDemoMode } from "./lib/moderation";
import { enforceDemoLimit } from "./lib/rateLimits";

// Bots are the user's AI teammates. Name, identity color, and a job
// description that becomes the bot's persona in the agent loop.

const botFields = {
  _id: v.id("bots"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  color: v.string(),
  purpose: v.string(),
  lastActiveAt: v.number(),
  avatarId: v.optional(v.id("_storage")),
  memory: v.optional(v.string()),
  isDemo: v.optional(v.boolean()),
  reminderEnabled: v.optional(v.boolean()),
  reminderMessage: v.optional(v.string()),
  reminderMinutes: v.optional(v.number()),
  reminderLastSentAt: v.optional(v.number()),
};

const botShape = v.object(botFields);

// Same doc plus the resolved avatar serving URL for screens that render it.
const botWithAvatarShape = v.object({
  ...botFields,
  avatarUrl: v.union(v.string(), v.null()),
});

// Resolve the avatar storage id to a serving URL. Null when no avatar.
async function withAvatarUrl(ctx: QueryCtx | MutationCtx, bot: Doc<"bots">) {
  return {
    ...bot,
    avatarUrl: bot.avatarId ? await ctx.storage.getUrl(bot.avatarId) : null,
  };
}

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    purpose: v.string(),
  },
  returns: v.id("bots"),
  handler: async (ctx, args) => {
    // Bot names and purposes render publicly in the demo; same rules as chat.
    checkText(args.name, "name");
    checkText(args.purpose, "name");
    await enforceDemoLimit(ctx, "createBot", args.userId);
    return await ctx.db.insert("bots", {
      userId: args.userId,
      name: args.name.trim(),
      color: args.color,
      purpose: args.purpose.trim(),
      lastActiveAt: Date.now(),
    });
  },
});

// Roster for the home screen and sidebar, most recently active first.
export const list = query({
  args: { userId: v.id("users") },
  returns: v.array(botWithAvatarShape),
  handler: async (ctx, args) => {
    const bots = await ctx.db
      .query("bots")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    bots.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    return await Promise.all(bots.map((b) => withAvatarUrl(ctx, b)));
  },
});

export const update = mutation({
  args: {
    botId: v.id("bots"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    purpose: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Partial<Doc<"bots">> = {};
    if (args.name !== undefined) {
      checkText(args.name, "name");
      patch.name = args.name.trim();
    }
    if (args.color !== undefined) patch.color = args.color;
    if (args.purpose !== undefined) {
      checkText(args.purpose, "name");
      patch.purpose = args.purpose.trim();
    }
    await ctx.db.patch(args.botId, patch);
    return null;
  },
});

// Single bot for the bot settings screen.
export const get = query({
  args: { botId: v.id("bots") },
  returns: v.union(botWithAvatarShape, v.null()),
  handler: async (ctx, args) => {
    const bot = await ctx.db.get(args.botId);
    return bot ? await withAvatarUrl(ctx, bot) : null;
  },
});

// Max avatar size. Small PNGs keep the roster and bubbles fast to load.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// Attach an uploaded PNG as the bot's avatar, or clear it with null.
// Validates against the _storage system table and deletes rejected or
// replaced files so storage never leaks. See docs/file-uploads.md.
export const setAvatar = mutation({
  args: {
    botId: v.id("bots"),
    storageId: v.union(v.id("_storage"), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bot = await ctx.db.get(args.botId);
    if (!bot) throw new Error("Bot not found");

    // The public demo is text only: no new avatars, though clearing (null)
    // still works. Uploads are already refused in files.ts.
    if (isDemoMode() && args.storageId !== null) {
      throw new ConvexError("Photo uploads are off in this public demo.");
    }

    if (args.storageId !== null) {
      const metadata = await ctx.db.system.get(args.storageId);
      if (!metadata) throw new Error("Upload not found");
      if (metadata.contentType !== "image/png") {
        await ctx.storage.delete(args.storageId);
        throw new Error("Avatar must be a PNG");
      }
      if (metadata.size > MAX_AVATAR_BYTES) {
        await ctx.storage.delete(args.storageId);
        throw new Error("Avatar must be under 2 MB");
      }
    }

    // Drop the previous file when replacing or clearing.
    if (bot.avatarId && bot.avatarId !== args.storageId) {
      await ctx.storage.delete(bot.avatarId);
    }
    await ctx.db.patch(args.botId, {
      avatarId: args.storageId ?? undefined,
    });
    return null;
  },
});

// One reminder per bot. The reminders cron sweeps enabled reminders every
// 5 minutes and posts due ones into the bot's latest thread.
export const setReminder = mutation({
  args: {
    botId: v.id("bots"),
    enabled: v.boolean(),
    message: v.optional(v.string()),
    intervalMinutes: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.message !== undefined) checkText(args.message, "message");
    await ctx.db.patch(args.botId, {
      reminderEnabled: args.enabled,
      ...(args.message !== undefined
        ? { reminderMessage: args.message.trim() }
        : {}),
      ...(args.intervalMinutes !== undefined
        ? { reminderMinutes: args.intervalMinutes }
        : {}),
    });
    return null;
  },
});

export const clearMemory = mutation({
  args: { botId: v.id("bots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.botId, { memory: undefined });
    return null;
  },
});

// Called by the remember tool. Memory is a capped bullet list so persona
// prompts stay small.
export const appendMemory = internalMutation({
  args: { botId: v.id("bots"), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bot = await ctx.db.get(args.botId);
    if (!bot) return null;
    const next = `${bot.memory ?? ""}\n- ${args.note.trim()}`.trim();
    await ctx.db.patch(args.botId, { memory: next.slice(-4000) });
    return null;
  },
});

// Deletes the bot and its threads. Messages in mixed group threads keep
// their botId; the UI resolves missing bots to a neutral name.
export const remove = mutation({
  args: { botId: v.id("bots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_bot_recent", (q) => q.eq("botId", args.botId))
      .collect();
    for (const thread of threads) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const m of messages) await ctx.db.delete(m._id);
      await ctx.db.delete(thread._id);
    }
    const skills = await ctx.db
      .query("skills")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
    for (const s of skills) await ctx.db.delete(s._id);
    // Free the avatar file along with the bot.
    const bot = await ctx.db.get(args.botId);
    if (bot?.avatarId) await ctx.storage.delete(bot.avatarId);
    await ctx.db.delete(args.botId);
    return null;
  },
});

// Used by the agent action to load personas for a group run.
export const getMany = internalQuery({
  args: { botIds: v.array(v.id("bots")) },
  returns: v.array(botShape),
  handler: async (ctx, args) => {
    const bots: Array<Doc<"bots">> = [];
    for (const id of args.botIds) {
      const bot = await ctx.db.get(id);
      if (bot) bots.push(bot);
    }
    return bots;
  },
});