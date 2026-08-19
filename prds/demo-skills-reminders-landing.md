# Demo bots, skill importer, reminders, and the landing page

Created: 2026-08-17 00:40 UTC
Last Updated: 2026-08-17 00:40 UTC
Status: In Progress

## Problem

The template works but arrives empty. A new user opens the app to a blank
roster, has no example of group chats or tools, and there is no public page
that explains what the template is or why Convex and Expo fit it. Bots have
no durable memory, no way to absorb pasted instructions, and no scheduled
behavior, so the "agent teammates" pitch is under-demonstrated.

## Proposed solution

Five pieces, kept intentionally small:

1. Posed demo workspace. First run seeds three demo bots with scripted
   chats: Chief of Staff (violet), Coach (green), Research Bot (blue).
   A Convex cron resets those chats every 5 minutes so the demo always
   looks fresh. A quiet banner in the app and on the landing page says so.
2. Skill importer. A `skill_import` agent tool. Paste a link or text into
   any chat and the bot can save it as a named skill for itself or a named
   teammate. Links go through Firecrawl when FIRECRAWL_API_KEY is set,
   plain fetch otherwise. Skills feed into the bot's persona prompt.
3. Bot memory. A `remember` tool lets a bot save short notes that persist
   across threads and are folded into its persona prompt. Inspired by
   rakazo's per-agent memory, without the sandbox stack. Composio, Daytona,
   and E2B stay as documented extension points via Convex actions; this
   template holds no server-side user keys.
4. Reminders. Each bot can have one reminder (message + interval). A cron
   sweeps every 5 minutes, posts due reminders as assistant messages in the
   bot's latest thread, and sends a push. Settings gets a global
   "Bot reminders" switch that silences all of them.
5. Landing page. A greyred `/landing` route: grey surfaces, one red accent,
   no gradients, no marketing subtext. CTAs: Copy prompt, Fork it (repo
   link), Read the docs. Lists features, why Convex, why Expo, and links
   the Convex components used.

Also in this pass: cancel button on the new-bot screen, a bot settings
screen (edit, reminder, memory, skills, delete), group chat creation,
ThinkingDots streaming indicator (thinking-orbs inspired, RN-native),
and removal of leftover product-name comments from the app code.

## Files to change

Backend (packages/backend/convex):
- schema.ts: skills table; bots += memory, isDemo, reminderEnabled,
  reminderMessage, reminderMinutes, reminderLastSentAt (flat fields so the
  cron can use an index); users += remindersEnabled; threads += isDemo +
  by_demo index; bots index by_reminderEnabled.
- skills.ts (new): saveFromTool internal, forBots internal, listForBot,
  remove.
- demo.ts (new): seed helper called from users.ensureUser on first run;
  resetDemoThreads internal mutation for the cron.
- reminders.ts (new): sendDue internal mutation.
- crons.ts (new): two 5-minute interval jobs.
- bots.ts: shape update, get query, setReminder, clearMemory,
  appendMemory internal.
- users.ts: seed on create, setRemindersEnabled, shape update.
- threads.ts: isDemo in get; createGroup mutation.
- tools/types.ts: ToolContext (ActionCtx bridge) as optional second
  execute arg.
- tools/skills.ts (new): skill_import tool.
- tools/memory.ts (new): remember tool.
- agent.ts: register tools, pass ToolContext, fold memory + skills into
  persona prompt, prompt line about saving pasted skills.

App (apps/native):
- components/ThinkingDots.tsx (new), components/DemoBanner.tsx (new).
- app/index.tsx: demo banner, per-bot settings entry, new group chat row.
- app/bot/new.tsx: cancel button.
- app/bot/[botId].tsx (new): bot settings.
- app/group/new.tsx (new): multi-select group chat creation.
- app/settings.tsx: global reminders switch.
- app/landing.tsx (new) + _layout.tsx route.
- components/MessageBubble.tsx: ThinkingDots for streaming, comment scrub.
- lib/theme.ts: accent token; lib/links.ts: landing/prompt additions.

Docs: README.md, docs/design.md, docs/integrations.md, docs/features.md
(new, bots/groups/reminders/skills), changelog.md, task.md, files.md.

## Edge cases

- Reminder due while user disabled the global switch: skipped, lastSentAt
  untouched, so it fires when re-enabled.
- Demo reset while a user is typing in a demo chat: their messages are
  wiped by design; the banner states it.
- skill_import with no bot persona (pre-bot thread): tool refuses politely.
- skill_import bot name that matches no teammate: saves to the current bot
  and says so.
- Bot deleted while its reminder is due: cron re-reads the bot, no-op.
- Memory capped (4000 chars) so persona prompts stay small.

## Verification

- npx convex dev deploys clean; tsc passes in both packages.
- Web smoke test: fresh device id seeds 3 demo chats; banner renders;
  create bot has cancel; bot settings edits and deletes; group chat with 2
  bots runs both; settings toggle persists; /landing renders and CTAs work.
- Wait for cron tick or run resetDemoThreads manually to see reset.

## Task completion log

- 2026-08-17 00:40 UTC PRD written, work started.
