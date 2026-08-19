import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { checkText, isDemoMode } from "./lib/moderation";
import { enforceDemoLimit } from "./lib/rateLimits";

const toolCallValidator = v.object({
  name: v.string(),
  input: v.string(),
  output: v.optional(v.string()),
  status: v.union(v.literal("running"), v.literal("done"), v.literal("error")),
});

const messageDoc = {
  _id: v.id("messages"),
  _creationTime: v.number(),
  threadId: v.id("threads"),
  userId: v.id("users"),
  botId: v.optional(v.id("bots")),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  status: v.union(v.literal("streaming"), v.literal("done"), v.literal("error")),
  toolCalls: v.optional(v.array(toolCallValidator)),
  attachments: v.optional(v.array(v.id("_storage"))),
};

// Reactive message list for the chat screen. Attachments resolve to serving
// URLs and bot authors resolve to name + identity color.
export const list = query({
  args: { threadId: v.id("threads") },
  returns: v.array(
    v.object({
      ...messageDoc,
      bot: v.union(
        v.object({
          name: v.string(),
          color: v.string(),
          avatarUrl: v.union(v.string(), v.null()),
        }),
        v.null()
      ),
      attachmentUrls: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    // Resolve each distinct bot author once, avatar URL included.
    const botCache = new Map<
      string,
      { name: string; color: string; avatarUrl: string | null } | null
    >();
    for (const m of messages) {
      if (m.botId && !botCache.has(m.botId)) {
        const bot = await ctx.db.get(m.botId);
        botCache.set(
          m.botId,
          bot
            ? {
                name: bot.name,
                color: bot.color,
                avatarUrl: bot.avatarId
                  ? await ctx.storage.getUrl(bot.avatarId)
                  : null,
              }
            : null
        );
      }
    }

    return await Promise.all(
      messages.map(async (m) => ({
        ...m,
        bot: m.botId ? (botCache.get(m.botId) ?? null) : null,
        attachmentUrls: m.attachments
          ? (
              await Promise.all(m.attachments.map((id) => ctx.storage.getUrl(id)))
            ).filter((u): u is string => u !== null)
          : [],
      }))
    );
  },
});

// Writes the user's message. The client calls agent.runAgent right after.
// Moderation runs server side: profanity is always blocked, and in demo mode
// links, oversized messages, and rapid-fire sends are rejected with a
// ConvexError the composer shows verbatim. See convex/lib/moderation.ts.
export const send = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    checkText(args.content, "message");
    // Text only in the public demo; uploads are already refused in files.ts,
    // this also stops storage ids minted elsewhere from being attached.
    if (isDemoMode() && args.attachments && args.attachments.length > 0) {
      throw new ConvexError("Photo attachments are off in this public demo.");
    }
    await enforceDemoLimit(ctx, "sendMessage", args.userId);
    await ctx.db.patch(args.threadId, { lastMessageAt: Date.now() });
    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      userId: args.userId,
      role: "user",
      content: args.content,
      status: "done",
      attachments: args.attachments,
    });
  },
});

// ---- internal plumbing used by the agent action ----

export const history = internalQuery({
  args: { threadId: v.id("threads") },
  returns: v.array(v.object(messageDoc)),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
  },
});

export const createAssistant = internalMutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    botId: v.optional(v.id("bots")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    if (args.botId) {
      await ctx.db.patch(args.botId, { lastActiveAt: Date.now() });
    }
    await ctx.db.patch(args.threadId, { lastMessageAt: Date.now() });
    return await ctx.db.insert("messages", {
      threadId: args.threadId,
      userId: args.userId,
      botId: args.botId,
      role: "assistant",
      content: "",
      status: "streaming",
    });
  },
});

export const appendContent = internalMutation({
  args: { messageId: v.id("messages"), chunk: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;
    await ctx.db.patch(args.messageId, {
      content: message.content + args.chunk,
    });
    return null;
  },
});

export const setToolCalls = internalMutation({
  args: {
    messageId: v.id("messages"),
    toolCalls: v.array(toolCallValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { toolCalls: args.toolCalls });
    return null;
  },
});

export const finish = internalMutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(v.literal("done"), v.literal("error")),
    errorText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: { status: "done" | "error"; content?: string } = {
      status: args.status,
    };
    if (args.status === "error" && args.errorText) {
      const message = await ctx.db.get(args.messageId);
      patch.content = (message?.content ?? "") + "\n\n" + args.errorText;
    }
    await ctx.db.patch(args.messageId, patch);
    return null;
  },
});
