import { internalMutation, MutationCtx, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { isDemoMode } from "./lib/moderation";

// ---------------------------------------------------------------------------
// The posed demo. First run seeds three demo bots with scripted chats plus
// one group thread. A cron (convex/crons.ts) calls resetDemoThreads every
// 5 minutes so the demo always opens clean. The app and landing page show a
// banner explaining the reset. Delete a demo bot and it stays deleted; the
// reset only rewrites chats for demo bots that still exist.
// ---------------------------------------------------------------------------

// Demo posture for the app, driven by deployment env vars so a fork is a
// normal private install by default. chatEnabled means live replies work:
// either demo mode is off (visitors bring their own keys) or the host set a
// server key. provider names the active demo provider so Settings can show
// an Active badge. No key material is ever read into this result.
export const config = query({
  args: {},
  returns: v.object({
    demoMode: v.boolean(),
    chatEnabled: v.boolean(),
    provider: v.union(v.string(), v.null()),
  }),
  handler: async () => {
    const demoMode = isDemoMode();
    const hasServerKey = Boolean(process.env.DEMO_LLM_API_KEY);
    return {
      demoMode,
      chatEnabled: !demoMode || hasServerKey,
      provider:
        demoMode && hasServerKey
          ? (process.env.DEMO_LLM_PROVIDER ?? "openrouter")
          : null,
    };
  },
});

type ScriptLine = { author: "user" | string; content: string };

const DEMO_BOTS: Array<{
  name: string;
  color: string;
  purpose: string;
  reminder?: { message: string; intervalMinutes: number };
  script: ScriptLine[];
}> = [
  {
    name: "Chief of Staff",
    color: "ink",
    purpose:
      "Run my day. Track priorities, draft plans, chase loose ends, and keep meetings short.",
    reminder: {
      message: "Quick check-in: what is the one thing that must ship today?",
      intervalMinutes: 60,
    },
    script: [
      { author: "user", content: "What should my top three be today?" },
      {
        author: "Chief of Staff",
        content:
          "Based on what you told me yesterday:\n1. Ship the pricing page copy\n2. Reply to the two investor intros\n3. 30 minutes on the hiring doc\n\nEverything else can wait until tomorrow. Want me to draft the investor replies?",
      },
      { author: "user", content: "Yes, draft the replies." },
      {
        author: "Chief of Staff",
        content:
          "Two drafts ready. Both open with a specific thank-you, give one traction number, and propose two meeting slots. Paste them wherever you send email, or add the AgentMail key in this template and I can send them myself.",
      },
    ],
  },
  {
    name: "Coach",
    color: "teal",
    purpose:
      "Life coach. Ask hard questions, keep me honest about energy and focus, celebrate real wins only.",
    reminder: {
      message: "Stand up, breathe, drink water. Then pick your next task on purpose.",
      intervalMinutes: 120,
    },
    script: [
      { author: "user", content: "I keep ending the day exhausted but behind." },
      {
        author: "Coach",
        content:
          "Exhausted and behind usually means reactive, not lazy. Two questions: what did you do first this morning, and who decided that? If the answer is email and not you, that is the leak.",
      },
      { author: "user", content: "Fair. Email, and definitely not me." },
      {
        author: "Coach",
        content:
          "Try this tomorrow: no inbox until one real task is done. I set a reminder to check on you. You can tune or turn it off in my settings.",
      },
    ],
  },
  {
    name: "Research Bot",
    color: "blue",
    purpose:
      "Research anything. Find sources, compare options, summarize with citations, flag weak claims.",
    script: [
      { author: "user", content: "Compare Convex and a REST API for a mobile chat app." },
      {
        author: "Research Bot",
        content:
          "Short version: chat is a live-data problem.\n\nREST: you poll or bolt on websockets, write cache invalidation, and version endpoints by hand.\n\nConvex: queries are subscriptions. A message insert updates every open screen with no refetch code. Mutations are transactions, and the schema plus generated types keep the app and backend honest.\n\nFor this template the agent loop is one Convex action; add the Firecrawl key and I can pull live sources with citations.",
      },
    ],
  },
];

// Group thread script. Shows the handoff pattern: mention a teammate by name
// and it picks up the work in order.
const GROUP_TITLE = "Monday planning";
const GROUP_SCRIPT: ScriptLine[] = [
  {
    author: "user",
    content: "@Chief of Staff plan my week. @Research Bot pull anything I should read first.",
  },
  {
    author: "Chief of Staff",
    content:
      "Week sketch: Mon ship pricing copy, Tue investor calls, Wed deep work on hiring doc, Thu customer interviews, Fri cleanup and review. @Research Bot, anything that changes this?",
  },
  {
    author: "Research Bot",
    content:
      "Two reads before Tuesday: your top competitor changed pricing last week, and one investor on your list published a new thesis post. Summaries are ready when you want them.",
  },
  {
    author: "Coach",
    content:
      "One note before you commit to that plan: you scheduled zero recovery time again. Move one Thursday interview or you will pay for it Friday.",
  },
];

// Seed the demo workspace for a brand-new user. Called from users.ensureUser
// inside the same mutation, so the first app open lands on a living roster.
export async function seedDemoWorkspace(ctx: MutationCtx, userId: Id<"users">) {
  const now = Date.now();
  const botIds = new Map<string, Id<"bots">>();

  for (const demo of DEMO_BOTS) {
    const botId = await ctx.db.insert("bots", {
      userId,
      name: demo.name,
      color: demo.color,
      purpose: demo.purpose,
      lastActiveAt: now,
      isDemo: true,
      ...(demo.reminder
        ? {
            reminderEnabled: true,
            reminderMessage: demo.reminder.message,
            reminderMinutes: demo.reminder.intervalMinutes,
            reminderLastSentAt: now,
          }
        : {}),
    });
    botIds.set(demo.name, botId);

    const threadId = await ctx.db.insert("threads", {
      userId,
      title: demo.name,
      lastMessageAt: now,
      botId,
      isDemo: true,
    });
    await writeScript(ctx, threadId, userId, demo.script, botIds);
  }

  // The group demo thread: Chief of Staff leads, the others are teammates.
  const lead = botIds.get("Chief of Staff")!;
  const groupId = await ctx.db.insert("threads", {
    userId,
    title: GROUP_TITLE,
    lastMessageAt: now,
    botId: lead,
    botIds: [botIds.get("Research Bot")!, botIds.get("Coach")!],
    isDemo: true,
  });
  await writeScript(ctx, groupId, userId, GROUP_SCRIPT, botIds);
}

async function writeScript(
  ctx: MutationCtx,
  threadId: Id<"threads">,
  userId: Id<"users">,
  script: ScriptLine[],
  botIds: Map<string, Id<"bots">>
) {
  for (const line of script) {
    await ctx.db.insert("messages", {
      threadId,
      userId,
      botId: line.author === "user" ? undefined : botIds.get(line.author),
      role: line.author === "user" ? "user" : "assistant",
      content: line.content,
      status: "done",
    });
  }
}

// Cron target. Rewrites every demo thread back to its script so the posed
// demo always looks fresh. Anything typed into a demo chat is wiped here;
// the in-app banner says so.
export const resetDemoThreads = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const demoThreads = await ctx.db
      .query("threads")
      .withIndex("by_demo", (q) => q.eq("isDemo", true))
      .collect();

    for (const thread of demoThreads) {
      const lead = thread.botId ? await ctx.db.get(thread.botId) : null;
      if (!lead) continue; // demo bot was deleted; leave the thread alone

      // Pick the script: group threads use the group script, solo threads
      // use the script that matches the lead bot's name.
      const isGroup = (thread.botIds ?? []).length > 0;
      const script = isGroup
        ? GROUP_SCRIPT
        : DEMO_BOTS.find((d) => d.name === lead.name)?.script;
      if (!script) continue;

      // Resolve author names to this user's demo bots.
      const userBots = await ctx.db
        .query("bots")
        .withIndex("by_user", (q) => q.eq("userId", thread.userId))
        .collect();
      const botIds = new Map<string, Id<"bots">>();
      for (const b of userBots) if (b.isDemo) botIds.set(b.name, b._id);

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect();
      for (const m of messages) await ctx.db.delete(m._id);

      for (const line of script) {
        const botId = line.author === "user" ? undefined : botIds.get(line.author);
        if (line.author !== "user" && !botId) continue; // author bot deleted
        await ctx.db.insert("messages", {
          threadId: thread._id,
          userId: thread.userId,
          botId,
          role: line.author === "user" ? "user" : "assistant",
          content: line.content,
          status: "done",
        });
      }
      await ctx.db.patch(thread._id, { lastMessageAt: Date.now() });
    }

    // Public demo hygiene: when DEMO_MODE=true, visitor-created content also
    // resets. Anything not part of the posed demo that has been idle for one
    // full tick gets deleted, so spam never sticks around and the banner
    // ("chats reset every 5 minutes") stays honest. An active conversation is
    // untouched because its lastMessageAt keeps moving. Off in forks.
    if (isDemoMode()) {
      const cutoff = Date.now() - 5 * 60 * 1000;

      const userThreads = await ctx.db
        .query("threads")
        .withIndex("by_demo", (q) => q.eq("isDemo", undefined))
        .collect();
      for (const thread of userThreads) {
        if (thread.lastMessageAt > cutoff) continue;
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
          .collect();
        for (const m of messages) await ctx.db.delete(m._id);
        await ctx.db.delete(thread._id);
      }

      // Custom bots idle past the cutoff go too, with their skills and
      // avatar files. isDemo is undefined on visitor-created bots.
      const customBots = await ctx.db
        .query("bots")
        .withIndex("by_demo", (q) => q.eq("isDemo", undefined))
        .collect();
      for (const bot of customBots) {
        if (bot.lastActiveAt > cutoff) continue;
        const skills = await ctx.db
          .query("skills")
          .withIndex("by_bot", (q) => q.eq("botId", bot._id))
          .collect();
        for (const s of skills) await ctx.db.delete(s._id);
        if (bot.avatarId) await ctx.storage.delete(bot.avatarId);
        await ctx.db.delete(bot._id);
      }
    }
    return null;
  },
});
