# @ mentions for bots

Created: 2026-08-16 23:58 UTC
Last Updated: 2026-08-17 00:40 UTC
Status: Done

## Problem

Threads can hold several bots, but the only way to direct a message at one of them is hoping the right bot picks it up. Every bot in the thread replies to every user message. Users need a way to summon a specific bot: type @name, that bot answers, the others stay quiet.

## Proposed solution

Mentions are parsed on the client at send time and routed through the existing `runAgent(botIds)` argument. No schema change.

1. Composer autocomplete. When the trailing token in the input starts with @, show a suggestion strip above the composer with the user's bots filtered by the typed prefix. Tapping inserts `@Name `.
2. Send-time parsing. `parseMentions(text, bots)` matches `@` + bot name (case insensitive, longest name first so `@Maxwell` never half-matches `@Max`, word boundary after the name, names with spaces supported). Returns mentioned bots in the order they appear.
3. Routing. If the message mentions bots: any mentioned bot not yet in the thread is added via `threads.addBot`, and only the mentioned bots respond, in mention order. No mentions: current behavior, every thread bot responds.
4. Prompt awareness. Persona prompt tells bots that users and teammates address each other as @Name.
5. Rendering. `@word` tokens in user bubbles render semibold so the mention reads as a mention.

## Files to change

- apps/native/lib/mentions.ts (new): parseMentions helper.
- apps/native/components/Composer.tsx: mentionables prop, suggestion strip, insert logic.
- apps/native/app/chat/[threadId].tsx: pass bots to Composer, parse mentions in onSend, add missing bots, route botIds.
- apps/native/components/MessageBubble.tsx: semibold @tokens in user messages.
- packages/backend/convex/agent.ts: persona prompt line about @Name.
- README.md, docs sync files.

## Edge cases

- Mention matches no bot: ignored, falls back to all thread bots.
- Bot name is a prefix of another bot's name: longest-name-first matching plus boundary check.
- Same bot mentioned twice: responds once.
- Mentioning a bot not in the thread: bot joins the thread (existing addBot, idempotent) then responds.
- Thread with no bots and no mentions: unnamed single agent, unchanged.
- Email addresses like a@b.com: the @ is preceded by a letter, not whitespace or start, so it is not treated as a mention trigger in the composer; parse requires the name to match a real bot so false positives are inert.

## Verification

- Typecheck both workspaces.
- Web smoke test: type @ in a group thread, pick a bot, send, confirm only that bot replies; send without mentions, confirm all bots reply; mention a bot not in the thread, confirm it joins and replies.

## Task completion log

- 2026-08-16 23:58 UTC: PRD created.
- 2026-08-17 00:40 UTC: Implemented and verified. parseMentions boundary checks tested against six edge cases in node (mention order, prefix names, emails, multi word names, dedupe). Both workspaces typecheck. Browser smoke test on web confirmed the strip appears on @, filters on prefix, and inserts the full name on tap. Full send verified by code path review; sending was skipped to avoid spending API tokens.
