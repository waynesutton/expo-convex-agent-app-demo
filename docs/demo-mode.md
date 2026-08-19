# Demo mode

One env var turns a private fork into a public demo that strangers can open safely. Forks leave it unset and get a normal install.

## What it does

Set `DEMO_MODE=true` on the deployment and the app changes posture:

- Settings hides all key inputs. Visitors see which provider is active, labeled Active, and never any part of a key.
- The home screen and every chat show a banner: chats are public and reset every 5 minutes.
- Messages are rejected server side if they contain profanity, links, or more than 2,000 characters.
- Sends are rate limited to 10 per minute and bot creation to 6 per hour, per visitor, using the official rate limiter component.
- The demo is text only. The composer's photo attach button and the bot avatar upload links disappear, and the backend enforces it: `files.generateUploadUrl` refuses to issue upload URLs, `messages.send` rejects attachments, and `bots.setAvatar` rejects new images (clearing still works).
- The app name is read-only. Settings shows the current wordmark with a note that renaming comes back after a fork, and `users.setAppName` rejects renames server side.
- The 5 minute reset cron also deletes visitor created bots, threads, and skills that have been idle for one full tick, so spam never sticks around. An active conversation keeps its `lastMessageAt` fresh and is left alone.

Profanity blocking is the one rule that stays on outside demo mode, in chats, bot names, thread titles, reminders, and the app name. To remove it in your fork, delete the `checkText` calls in `packages/backend/convex` (search the folder for `checkText`).

## Turn it on

From `packages/backend`:

```bash
npx convex env set DEMO_MODE true
```

Live replies need a server side key, since visitors cannot add their own:

```bash
npx convex env set DEMO_LLM_PROVIDER openrouter
npx convex env set DEMO_LLM_API_KEY <your key>
npx convex env set DEMO_LLM_MODEL anthropic/claude-sonnet-4-6   # optional
```

The key lives in Convex env vars only. It is read inside the agent action, sent to the provider you named, and never logged, stored, or returned to a client. The `demo.config` query reports only booleans and the provider name. Without a demo key, the posed demo chats still work and the composer explains that live replies are off.

Add `--prod` to each command when the demo runs on your production deployment.

## Turn it off after you fork

Demo mode is off by default, so a fresh fork needs nothing. If you cloned a deployment that had it on:

```bash
npx convex env remove DEMO_MODE
npx convex env remove DEMO_LLM_PROVIDER
npx convex env remove DEMO_LLM_API_KEY
npx convex env remove DEMO_LLM_MODEL
```

Settings gets its key inputs back, moderation drops to profanity checks only, rate limits and the cleanup sweep stop, and keys go back to living in your device keychain per docs/byok.md.

## Add auth to your fork

Demo mode is a stopgap for a shared deployment, not an access control system. Users are keyed by a device id, which is why demo chats count as public. The intended path for a real app is Convex Auth: docs/auth.md walks through the plan, and the schema already carries `userId` on every table so the migration is a data move, not a rewrite. Do not wire Better Auth, Clerk, or WorkOS into this template.

## How it is built

- `convex/demo.ts` exposes `demo.config`, the query the app reads to decide its posture. Env changes redeploy functions, so clients pick up the new posture on their own.
- `convex/lib/moderation.ts` holds the word list, link detection, and length cap. All checks run in mutations, so a client build cannot skip them.
- `convex/lib/rateLimits.ts` wraps `@convex-dev/rate-limiter` with demo only enforcement.
- `convex/agent.ts` accepts an optional client key. Missing key plus demo mode means the server key is used and the client picked provider is ignored, so the key only ever reaches the provider it belongs to.
- `convex/demo.ts` `resetDemoThreads` runs the cleanup sweep on the existing 5 minute cron.
