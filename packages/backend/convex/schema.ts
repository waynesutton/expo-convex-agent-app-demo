import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// NOTE ON AUTH: there is intentionally no auth wired yet. Users are keyed by a
// per-install deviceId. Every table carries userId so the future Convex Auth
// migration (docs/auth.md) is a data move, not a rewrite.
// Hard rule: no API key fields anywhere in this schema. User LLM keys live in
// expo-secure-store on device and are passed per request. See docs/byok.md.

export default defineSchema({
  users: defineTable({
    deviceId: v.string(),
    name: v.optional(v.string()),
    // Workspace brand shown in the app header. Absent means "expo-demo".
    // Set from Settings after forking; demo content is unaffected.
    appName: v.optional(v.string()),
    pushEnabled: v.boolean(),
    // Global switch for bot reminders. Absent means on.
    remindersEnabled: v.optional(v.boolean()),
    // When the posed demo was seeded for this user. Absent means never, so
    // ensureUser backfills installs that predate the demo. Once set, deleted
    // demo bots stay deleted.
    demoSeededAt: v.optional(v.number()),
  }).index("by_deviceId", ["deviceId"]),

  // Bots are named teammates. Each has a job (purpose) folded into its system
  // prompt and an identity color from the theme palette. Several bots can sit
  // in one thread and respond to each other.
  bots: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.string(), // key into the app's bot identity palette
    purpose: v.string(),
    lastActiveAt: v.number(),
    // Optional PNG avatar in Convex file storage, capped at 2 MB by
    // bots.setAvatar. Absent means the initial-on-color avatar.
    avatarId: v.optional(v.id("_storage")),
    // Notes the bot saved with the remember tool. Folded into its persona.
    memory: v.optional(v.string()),
    // Seeded demo bots. Their chats reset on a cron; see convex/demo.ts.
    isDemo: v.optional(v.boolean()),
    // Reminder fields stay flat so the cron can sweep by index.
    reminderEnabled: v.optional(v.boolean()),
    reminderMessage: v.optional(v.string()),
    reminderMinutes: v.optional(v.number()),
    reminderLastSentAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_reminderEnabled", ["reminderEnabled"])
    // Lets the demo-mode cleanup sweep visitor-created bots without a scan.
    .index("by_demo", ["isDemo"])
    // Full text search over bot names for the search screen.
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),

  // Skills are reusable instructions a bot follows, saved from pasted text
  // or a URL via the skill_import tool. They extend the persona prompt.
  skills: defineTable({
    userId: v.id("users"),
    botId: v.id("bots"),
    name: v.string(),
    instructions: v.string(),
    sourceUrl: v.optional(v.string()),
  })
    .index("by_bot", ["botId"])
    .index("by_user", ["userId"]),

  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.number(),
    // Primary bot for this thread. Optional so pre-bot threads keep working.
    botId: v.optional(v.id("bots")),
    // Extra teammates added to the thread for group runs.
    botIds: v.optional(v.array(v.id("bots"))),
    // Demo threads are reset to their script every 5 minutes by a cron.
    isDemo: v.optional(v.boolean()),
  })
    .index("by_user_recent", ["userId", "lastMessageAt"])
    .index("by_bot_recent", ["botId", "lastMessageAt"])
    .index("by_demo", ["isDemo"])
    // Full text search over chat titles for the search screen.
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  messages: defineTable({
    threadId: v.id("threads"),
    userId: v.id("users"),
    // Which bot authored this assistant message. Absent on user messages.
    botId: v.optional(v.id("bots")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    status: v.union(
      v.literal("streaming"),
      v.literal("done"),
      v.literal("error")
    ),
    toolCalls: v.optional(
      v.array(
        v.object({
          name: v.string(),
          input: v.string(), // JSON string the model produced
          output: v.optional(v.string()), // JSON or text result
          status: v.union(
            v.literal("running"),
            v.literal("done"),
            v.literal("error")
          ),
        })
      )
    ),
    attachments: v.optional(v.array(v.id("_storage"))),
  })
    .index("by_thread", ["threadId"])
    // Full text search over message content for the search screen.
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    }),
});
