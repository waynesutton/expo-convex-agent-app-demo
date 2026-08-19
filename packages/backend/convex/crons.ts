import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Two scheduled jobs, both on a 5 minute tick:
// 1. Demo reset: rewrites the seeded demo chats back to their script so the
//    posed demo always opens clean. Banner copy in the app and landing page
//    matches this interval; change them together.
// 2. Reminders: sweeps bots with an enabled reminder and posts due ones.
//    Each bot's own interval decides if it fires on a given tick.
const crons = cronJobs();

crons.interval(
  "reset demo chats",
  { minutes: 5 },
  internal.demo.resetDemoThreads,
  {}
);

crons.interval(
  "send bot reminders",
  { minutes: 5 },
  internal.reminders.sendDue,
  {}
);

export default crons;
