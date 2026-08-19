import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { checkText } from "./lib/moderation";

const botSummary = v.object({
  _id: v.id("bots"),
  name: v.string(),
  color: v.string(),
  avatarUrl: v.union(v.string(), v.null()),
});

// Resolve every bot participating in a thread (primary + added teammates).
async function threadBots(ctx: QueryCtx, thread: Doc<"threads">) {
  const ids: Array<Id<"bots">> = [];
  if (thread.botId) ids.push(thread.botId);
  for (const id of thread.botIds ?? []) {
    if (!ids.includes(id)) ids.push(id);
  }
  const bots: Array<{
    _id: Id<"bots">;
    name: string;
    color: string;
    avatarUrl: string | null;
  }> = [];
  for (const id of ids) {
    const bot = await ctx.db.get(id);
    if (bot) {
      bots.push({
        _id: bot._id,
        name: bot.name,
        color: bot.color,
        avatarUrl: bot.avatarId ? await ctx.storage.getUrl(bot.avatarId) : null,
      });
    }
  }
  return bots;
}

export const list = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("threads"),
      _creationTime: v.number(),
      userId: v.id("users"),
      title: v.string(),
      lastMessageAt: v.number(),
      botId: v.optional(v.id("bots")),
      botIds: v.optional(v.array(v.id("bots"))),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withIndex("by_user_recent", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

// One thread with its bot participants resolved, for the chat header.
export const get = query({
  args: { threadId: v.id("threads") },
  returns: v.union(
    v.object({
      _id: v.id("threads"),
      title: v.string(),
      botId: v.optional(v.id("bots")),
      isDemo: v.optional(v.boolean()),
      bots: v.array(botSummary),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    return {
      _id: thread._id,
      title: thread.title,
      botId: thread.botId,
      isDemo: thread.isDemo,
      bots: await threadBots(ctx, thread),
    };
  },
});

// The latest thread led by this bot, or null. Tapping a bot in the roster
// resumes the conversation the way a messages app would.
export const latestForBot = query({
  args: { botId: v.id("bots") },
  returns: v.union(v.id("threads"), v.null()),
  handler: async (ctx, args) => {
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_bot_recent", (q) => q.eq("botId", args.botId))
      .order("desc")
      .first();
    return thread?._id ?? null;
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
    botId: v.optional(v.id("bots")),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    let title = args.title;
    if (!title && args.botId) {
      const bot = await ctx.db.get(args.botId);
      title = bot?.name ?? "New thread";
    }
    return await ctx.db.insert("threads", {
      userId: args.userId,
      title: title ?? "New thread",
      lastMessageAt: Date.now(),
      botId: args.botId,
    });
  },
});

// Start a group chat with several bots at once. The first bot leads the
// thread; the rest join as teammates. Bots respond in this order and each
// sees the replies before it, so the order is the workflow.
export const createGroup = mutation({
  args: {
    userId: v.id("users"),
    botIds: v.array(v.id("bots")),
    title: v.optional(v.string()),
  },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    if (args.botIds.length < 2) {
      throw new Error("A group chat needs at least two bots");
    }
    if (args.title) checkText(args.title, "title");
    const names: string[] = [];
    for (const id of args.botIds) {
      const bot = await ctx.db.get(id);
      if (!bot) throw new Error("Bot not found");
      names.push(bot.name);
    }
    return await ctx.db.insert("threads", {
      userId: args.userId,
      title: args.title?.trim() || names.join(" + "),
      lastMessageAt: Date.now(),
      botId: args.botIds[0],
      botIds: args.botIds.slice(1),
    });
  },
});

// Pull another bot into the thread so they can work together.
export const addBot = mutation({
  args: { threadId: v.id("threads"), botId: v.id("bots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.botId === args.botId) return null;
    const existing = thread.botIds ?? [];
    if (existing.includes(args.botId)) return null;
    const bot = await ctx.db.get(args.botId);
    if (!bot) throw new Error("Bot not found");
    await ctx.db.patch(args.threadId, {
      botIds: [...existing, args.botId],
      title: `${thread.title} + ${bot.name}`,
    });
    return null;
  },
});

export const rename = mutation({
  args: { threadId: v.id("threads"), title: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    checkText(args.title, "title");
    await ctx.db.patch(args.threadId, { title: args.title });
    return null;
  },
});

export const remove = mutation({
  args: { threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);
    await ctx.db.delete(args.threadId);
  },
});
