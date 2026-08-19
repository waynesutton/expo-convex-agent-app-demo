import { query } from "./_generated/server";
import { v } from "convex/values";

// Full text search across the workspace, powering the search screen.
// One query string in, three ranked lists out: bots by name, chats by
// title, messages by content. Convex prefix-matches the final term, so
// results update as you type. https://docs.convex.dev/search/text-search

export const all = query({
  args: { userId: v.id("users"), query: v.string() },
  returns: v.object({
    bots: v.array(
      v.object({
        _id: v.id("bots"),
        name: v.string(),
        color: v.string(),
        purpose: v.string(),
        avatarUrl: v.union(v.string(), v.null()),
      })
    ),
    threads: v.array(
      v.object({
        _id: v.id("threads"),
        title: v.string(),
        lastMessageAt: v.number(),
      })
    ),
    messages: v.array(
      v.object({
        _id: v.id("messages"),
        threadId: v.id("threads"),
        content: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        threadTitle: v.string(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const term = args.query.trim();
    if (term === "") return { bots: [], threads: [], messages: [] };

    const [botHits, threadHits, messageHits] = await Promise.all([
      ctx.db
        .query("bots")
        .withSearchIndex("search_name", (q) =>
          q.search("name", term).eq("userId", args.userId)
        )
        .take(5),
      ctx.db
        .query("threads")
        .withSearchIndex("search_title", (q) =>
          q.search("title", term).eq("userId", args.userId)
        )
        .take(5),
      ctx.db
        .query("messages")
        .withSearchIndex("search_content", (q) =>
          q.search("content", term).eq("userId", args.userId)
        )
        .take(8),
    ]);

    // Resolve thread titles for message hits so each row can say where
    // the match lives. Cache per thread; hits often share one.
    const titleCache = new Map<string, string>();
    const messages = [];
    for (const m of messageHits) {
      if (!titleCache.has(m.threadId)) {
        const thread = await ctx.db.get(m.threadId);
        titleCache.set(m.threadId, thread?.title ?? "Chat");
      }
      messages.push({
        _id: m._id,
        threadId: m.threadId,
        // Cap the snippet so search rows stay one line tall.
        content: m.content.slice(0, 140),
        role: m.role,
        threadTitle: titleCache.get(m.threadId) ?? "Chat",
      });
    }

    return {
      bots: await Promise.all(
        botHits.map(async (b) => ({
          _id: b._id,
          name: b.name,
          color: b.color,
          purpose: b.purpose,
          avatarUrl: b.avatarId ? await ctx.storage.getUrl(b.avatarId) : null,
        }))
      ),
      threads: threadHits.map((t) => ({
        _id: t._id,
        title: t.title,
        lastMessageAt: t.lastMessageAt,
      })),
      messages,
    };
  },
});
