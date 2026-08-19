# PNG bot avatars, full text search, Beautiful UI updates

Created: 2026-08-17 01:55 UTC
Last Updated: 2026-08-17 01:57 UTC
Status: Done

## Problem

Three gaps in the template:

1. Bots only have an initial on a colored squircle. Users want to upload a
   small PNG as a bot avatar, stored in Convex file storage, capped at 2 MB.
2. No way to find a bot or a past conversation. As bots and chats grow the
   roster scroll stops working. Convex full text search exists for exactly
   this and the template should show it off.
3. The app should adopt the Beautiful UI primitives that map to surfaces we
   already have: Search (15), Sidebar Nav quick search (14), Prompt Bar (08).

## Proposed solution

### Avatars

- Schema: `bots.avatarId: v.optional(v.id("_storage"))`.
- `bots.setAvatar` mutation: validates via `ctx.db.system.get` that the file
  is `image/png` and at most 2 MB, deletes the rejected upload, deletes the
  previous avatar when replacing, supports clearing (null).
- `avatarUrl` resolved through `ctx.storage.getUrl` in `bots.list`,
  `bots.get`, `threads.get` bot summaries, and `messages.list` bot authors.
- `BotAvatar` renders the image when a URL is present, initial otherwise.
- Upload UI in bot settings identity row: pick with expo-image-picker,
  client checks type and size before upload, remove option to go back to
  the initial. Reuses `files.generateUploadUrl` like chat attachments.

### Search

- Search indexes (docs.convex.dev/search/text-search):
  - `bots.search_name` on `name`, filter `userId`
  - `threads.search_title` on `title`, filter `userId`
  - `messages.search_content` on `content`, filter `userId`
- `convex/search.ts` `search.all` query: one query string in, three ranked
  lists out (bots take 5, threads take 5, messages take 8 with thread title
  resolved). Empty query returns empty lists. Typeahead works because the
  final term is prefix matched.
- `app/search.tsx`: autofocus input, live results as you type, sections for
  bots, chats, and messages, empty state with hints. Tapping a bot resumes
  its latest thread; tapping a chat or message opens the thread.
- Entry points: magnifying glass in the home header next to the gear, and
  in the desktop sidebar header (Sidebar Nav quick search).

### Beautiful UI mapping

- Search (15): the new search screen, live filtering plus hint empty state.
- Sidebar Nav (14): quick search entry in the sidebar header.
- Prompt Bar (08): attached image now previews as a thumbnail with remove,
  instead of a "1 image" text note.
- Streaming Text / Thinking: already covered by ThinkingDots.
- Recommendation Card and Context Cards: skipped on purpose. They assume
  agent suggestion and retrieval chunk surfaces this template does not have;
  building those just to host the cards would be bloat.

## Files to change

- packages/backend/convex/schema.ts (avatarId, three search indexes)
- packages/backend/convex/bots.ts (setAvatar, avatarUrl in list/get)
- packages/backend/convex/threads.ts (avatarUrl in bot summaries)
- packages/backend/convex/messages.ts (avatarUrl on bot authors)
- packages/backend/convex/search.ts (new)
- apps/native/components/BotAvatar.tsx (image support)
- apps/native/components/Composer.tsx (attachment thumbnail)
- apps/native/components/BotSidebar.tsx (search entry, avatarUrl)
- apps/native/app/bot/[id].tsx (avatar upload UI)
- apps/native/app/search.tsx (new), app/_layout.tsx (route)
- apps/native/app/index.tsx, app/chat/[threadId].tsx (avatarUrl pass through, search icon)
- README.md, files.md, changelog.md, task.md

## Edge cases

- Upload of a non PNG or over 2 MB: server rejects and deletes the blob so
  storage does not leak; client checks first for a fast error.
- Replacing an avatar deletes the old storage object.
- Deleted bot: `bots.remove` also deletes its avatar file.
- Search with an empty or whitespace query returns nothing and renders the
  hint state, not an empty result set.
- Message hits in deleted threads cannot happen; messages are deleted with
  their thread.

## Verification

- `npx convex dev --once` deploys schema and functions clean.
- `npx tsc --noEmit` in both workspaces.
- Web smoke: upload a PNG avatar, see it in roster, sidebar, chat header,
  and bubbles; search for a bot name, a thread title, and a message word.

## Task completion log

- 2026-08-17 01:55 UTC Created.
- 2026-08-17 01:57 UTC Done. Schema, setAvatar, search.ts, BotAvatar image support, avatar upload UI, search screen and entry points, composer thumbnail all shipped. Convex dev deploys clean, both workspaces typecheck, web smoke test confirmed live search results for "coach". Docs synced: README, docs/file-uploads.md, changelog, task, files.
