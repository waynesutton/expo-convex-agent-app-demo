import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { seedDemoWorkspace } from "./demo";
import { checkText, isDemoMode } from "./lib/moderation";

// Upsert a user for this device install. Called once on app start.
// Replaced by ctx.auth.getUserIdentity() when Convex Auth lands (docs/auth.md).
// First run also seeds the posed demo (three bots, scripted chats) so the
// app never opens empty. See convex/demo.ts.
export const ensureUser = mutation({
  args: { deviceId: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
    if (existing) {
      // Backfill: installs that predate the posed demo get it once. After
      // that, demoSeededAt is set, so deleting demo bots is permanent.
      if (existing.demoSeededAt === undefined) {
        await seedDemoWorkspace(ctx, existing._id);
        await ctx.db.patch(existing._id, { demoSeededAt: Date.now() });
      }
      return existing._id;
    }
    const userId = await ctx.db.insert("users", {
      deviceId: args.deviceId,
      pushEnabled: false,
      demoSeededAt: Date.now(),
    });
    await seedDemoWorkspace(ctx, userId);
    return userId;
  },
});

// Global switch for bot reminders (Settings screen). False silences every
// bot reminder; the per-bot schedule keeps ticking so nothing fires late
// twice when it is turned back on.
export const setRemindersEnabled = mutation({
  args: { userId: v.id("users"), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { remindersEnabled: args.enabled });
    return null;
  },
});

// Rename the app for a fork (Settings screen). Trims, caps at 30 chars, and
// an empty string clears the field so the wordmark falls back to expo-demo.
// This renames the shell only; demo bots and threads are untouched.
export const setAppName = mutation({
  args: { userId: v.id("users"), appName: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // The public demo keeps its wordmark; settings shows the name read-only.
    if (isDemoMode()) {
      throw new ConvexError("Renaming the app is off in this public demo.");
    }
    checkText(args.appName, "name");
    const trimmed = args.appName.trim().slice(0, 30);
    await ctx.db.patch(args.userId, {
      appName: trimmed.length > 0 ? trimmed : undefined,
    });
    return null;
  },
});

const userShape = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  deviceId: v.string(),
  name: v.optional(v.string()),
  appName: v.optional(v.string()),
  pushEnabled: v.boolean(),
  remindersEnabled: v.optional(v.boolean()),
  demoSeededAt: v.optional(v.number()),
});

export const getByDevice = query({
  args: { deviceId: v.string() },
  returns: v.union(userShape, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .unique();
  },
});

// Lookup by id for screens that already hold a userId (home header, sidebar).
export const get = query({
  args: { userId: v.id("users") },
  returns: v.union(userShape, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
