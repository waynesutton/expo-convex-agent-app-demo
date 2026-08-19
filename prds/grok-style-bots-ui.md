# Grok Bot style multi bot UI

Created: 2026-08-16 23:20 UTC
Last Updated: 2026-08-16 23:35 UTC
Status: Done

## Problem

expo-demo v0.1 has one anonymous agent and a dark terminal look. The reference direction (Grok Bot, announced August 2026) treats agents as named teammates: a roster of bots with colorful identities, message them like coworkers, put several in one thread and let them coordinate. expo-demo needs that model plus a light mode default and a desktop sidebar, while staying mobile first on Expo.

## Proposed solution

### Backend (packages/backend)

- New `bots` table: userId, name, color (identity token), purpose (folded into the system prompt), lastActiveAt. Index by_user.
- `threads` gains optional `botId` (primary bot, indexed by_bot_recent) and optional `botIds` (extra participants for group threads).
- `messages` gains optional `botId` so every assistant message is attributed to the bot that wrote it.
- New `convex/bots.ts`: create, list, update, remove, internal getMany.
- `agent.runAgent` accepts `botIds`. For each bot in order it builds a persona system prompt (name, job, teammates in thread), runs the tool loop, and writes a message attributed to that bot. Bots see prior bot replies in the transcript (prefixed with the author name), so they respond to each other. One round per user message keeps cost bounded.
- All existing fields stay optional-compatible; no data migration needed.

### Frontend (apps/native)

- `lib/theme.ts` rewritten light first. Tokens: paper, mist, line, ink, slate, signal, plus an 8 color bot identity palette. Ink black is the user bubble and primary action color.
- `app/index.tsx` becomes the bot roster: avatar blob, name, job preview, last activity. Tapping a bot opens its latest thread or starts one. Empty state invites creating the first bot.
- New `app/bot/new.tsx` modal: name, color swatch picker, job description.
- `app/chat/[threadId].tsx`: bot header, add a teammate bot to the thread, sidebar rendered on wide screens (>= 900px) for desktop web.
- New `components/BotAvatar.tsx` (identity blob) and `components/BotSidebar.tsx` (desktop bot list + new bot).
- `MessageBubble` restyled: user ink bubble right, bot mist bubble left with avatar and name.
- `Composer` restyled as a rounded pill with Phosphor icons.
- Icons: `phosphor-react-native` + `react-native-svg`.

## Files to change

Backend: schema.ts, bots.ts (new), threads.ts, messages.ts, agent.ts.
Native: lib/theme.ts, app/_layout.tsx, app/index.tsx, app/bot/new.tsx (new), app/chat/[threadId].tsx, app/settings.tsx, components/BotAvatar.tsx (new), components/BotSidebar.tsx (new), components/MessageBubble.tsx, components/Composer.tsx, components/ToolCallCard.tsx.

## Edge cases

- Existing threads without botId keep working (all new fields optional).
- Removing a bot keeps its past messages; the name resolves to "Bot" if missing.
- Group runs stop after each participant answers once per user message (MAX_TOOL_ITERATIONS still bounds tools per bot).
- BYOK rule unchanged: one key rides the whole group run, never persisted.
- Web preview keeps working (secure-store fallback already in place).

## Verification

- `npx convex dev` deploys schema and functions clean.
- `npm run typecheck` passes in both workspaces.
- Browser demo: create bots, roster renders, chat opens, group add works, sidebar appears at desktop width.

## Task completion log

- 2026-08-16 23:20 UTC PRD created.
- 2026-08-16 23:24 UTC Backend done: bots table and functions, thread and message bot fields, persona passes in agent.runAgent, return validators everywhere. Convex deploys clean.
- 2026-08-16 23:29 UTC Frontend done: light theme tokens, roster, create bot modal, chat restyle, teammate picker, desktop sidebar, Phosphor icons. Both workspaces typecheck.
- 2026-08-16 23:35 UTC Browser verified: empty state, bot creation to chat, group thread title after addBot, sidebar at 1280px emulation. Docs synced.
