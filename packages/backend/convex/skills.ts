import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Skills are reusable instructions attached to a bot. They come from the
// skill_import tool (paste a link or text in chat) and are folded into the
// bot's persona prompt by the agent loop.

const skillShape = v.object({
  _id: v.id("skills"),
  _creationTime: v.number(),
  userId: v.id("users"),
  botId: v.id("bots"),
  name: v.string(),
  instructions: v.string(),
  sourceUrl: v.optional(v.string()),
});

// Called by the skill_import tool from the agent action. Resolves the target
// bot by name among the user's bots; falls back to the bot running the tool.
export const saveFromTool = internalMutation({
  args: {
    userId: v.id("users"),
    currentBotId: v.optional(v.id("bots")),
    targetBotName: v.optional(v.string()),
    name: v.string(),
    instructions: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    let botId = args.currentBotId;
    let note = "";
    if (args.targetBotName) {
      const bots = await ctx.db
        .query("bots")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      const match = bots.find(
        (b) => b.name.toLowerCase() === args.targetBotName!.toLowerCase()
      );
      if (match) {
        botId = match._id;
      } else if (botId) {
        note = ` (no bot named ${args.targetBotName}; saved to the current bot instead)`;
      }
    }
    if (!botId) {
      throw new Error("No target bot. Create or name a bot first.");
    }
    const bot = await ctx.db.get(botId);
    if (!bot) throw new Error("Bot not found");
    await ctx.db.insert("skills", {
      userId: args.userId,
      botId,
      name: args.name.trim().slice(0, 80),
      instructions: args.instructions.trim().slice(0, 8000),
      sourceUrl: args.sourceUrl,
    });
    return `Saved skill "${args.name.trim()}" to ${bot.name}${note}.`;
  },
});

// Skills for a set of bots, used by the agent loop to build personas.
export const forBots = internalQuery({
  args: { botIds: v.array(v.id("bots")) },
  returns: v.array(skillShape),
  handler: async (ctx, args) => {
    const all = [];
    for (const botId of args.botIds) {
      const skills = await ctx.db
        .query("skills")
        .withIndex("by_bot", (q) => q.eq("botId", botId))
        .collect();
      all.push(...skills);
    }
    return all;
  },
});

// Skill list for the bot settings screen.
export const listForBot = query({
  args: { botId: v.id("bots") },
  returns: v.array(skillShape),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_bot", (q) => q.eq("botId", args.botId))
      .collect();
  },
});

export const remove = mutation({
  args: { skillId: v.id("skills") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.skillId);
    return null;
  },
});
