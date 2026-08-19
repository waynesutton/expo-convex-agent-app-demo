# Files

Brief map of the codebase. One line per file.

## Root

- `package.json` - npm workspaces root; `npm run dev` starts backend and app together, `npm run site:preview` and `npm run site:deploy` upload the landing page and web demo to Convex static hosting.
- `AGENTS.md` - source of truth instructions for coding agents.
- `CLAUDE.md` - pointer to AGENTS.md for Claude Code.
- `PRD.md` - product requirements: what expo-demo is and why.
- `README.md` - what this is, features, folder map, static hosting, keyless setup prompt, Convex API, components, GitHub and Convex deploy.
- `LICENSE` - MIT.
- `task.md` - running task list with completion timestamps.
- `changelog.md` - Keep a Changelog history.
- `files.md` - this file.

## apps/native (Expo app)

- `app/_layout.tsx` - root stack, ConvexProvider, notification tap wiring, light theme on headers.
- `app/index.tsx` - bot roster home; ensures the device user, registers push, opens or starts a bot's thread.
- `app/bot/new.tsx` - create bot modal: name, identity color swatches, job description, live avatar preview, cancel button.
- `app/bot/[id].tsx` - bot settings: PNG avatar upload (2 MB cap), reminder schedule and message, memory view and clear, skills list and remove, delete with tap again confirmation.
- `app/search.tsx` - full text search screen: live results across bots, chats, and messages via search.all.
- `app/group/new.tsx` - group chat creation: pick two or more bots, optional title.
- `app/chat/[threadId].tsx` - chat screen; bot header, teammate picker, desktop sidebar at 900px+, BYOK key read per send (skipped in demo mode), image upload, runAgent call with the thread's bots, moderation and rate limit notices, public demo banner.
- `app/settings.tsx` - BYOK settings; provider picker (five providers incl. Concentrate) and per provider key inputs, saved to secure store; in demo mode the key UI is replaced by a read only provider status card (Active label, no key material); app rename card for forks, reminders toggle, AgentMail card, About row.
- `app/about.tsx` - about modal: what the template is, links to the landing page (derived from the Convex URL), README, docs, Convex docs, Expo docs.
- `components/BotAvatar.tsx` - the bot identity blob: uploaded PNG avatar when set, colored squircle with the bot's initial otherwise.
- `components/BotSidebar.tsx` - desktop roster beside the chat; active bot highlight, new bot button.
- `components/MessageBubble.tsx` - ink user bubbles right, mist bot bubbles left with avatar and name, tool call cards.
- `components/Composer.tsx` - rounded pill input with Phosphor attach and send icons; attachment thumbnail preview with remove, keeps draft when send is blocked; allowAttachments prop hides the photo path in the public demo.
- `components/ToolCallCard.tsx` - quiet mono card for tool call transcripts.
- `components/ThinkingDots.tsx` - three breathing dots shown while a bot streams.
- `components/DemoBanner.tsx` - banner in demo chats explaining the 5 minute reset; also carries the public demo notice on home and chat screens in demo mode.
- `lib/theme.ts` - light-first design tokens (soft grey ground, palette aligned greys) plus the seven color bot identity palette, no purple, with botInitialColor for light swatches and the noFocusRing web outline remover for text inputs.
- `lib/time.ts` - compact relative timestamps for roster rows.
- `lib/convex.ts` - ConvexReactClient built from EXPO_PUBLIC_CONVEX_URL.
- `lib/keys.ts` - BYOK storage on expo-secure-store, localStorage fallback on web, device id.
- `lib/push.ts` - Expo push token registration and notification tap routing; no ops on web.
- `lib/links.ts` - REPO_URL set to the published GitHub repo; landingUrl() derives the hosted landing page from EXPO_PUBLIC_CONVEX_URL (LANDING_URL overrides).
- `lib/mentions.ts` - @mention parsing: which bots a message summons, the trailing @query for autocomplete, and mention insertion.
- `app.json` - Expo config: name, scheme, plugins; experiments.baseUrl "/app" so the web export serves from the /app/ sub path.
- `eas.json` - EAS build and submit profiles.
- `.env.example` - template for EXPO_PUBLIC_CONVEX_URL.

## packages/backend (Convex)

- `convex/schema.ts` - tables: users (by_deviceId), bots (by_user), threads (by_user_recent, by_bot_recent), messages (by_thread), skills (by_bot); bot memory, reminder, avatarId, and isDemo fields; search indexes on bot names, thread titles, and message content.
- `convex/users.ts` - ensureUser mutation keyed on deviceId; seeds the posed demo once (demoSeededAt), global remindersEnabled toggle, setAppName rename for forks, get and getByDevice queries.
- `convex/bots.ts` - create, get, list, update, remove (cascades chats, skills, and avatar file), setAvatar with PNG and 2 MB validation, setReminder, memory mutations; internal getMany for the agent loop.
- `convex/search.ts` - search.all query: one term in, ranked bot, chat, and message hits out via the three search indexes.
- `convex/threads.ts` - create, createGroup, list, get with bot participants and isDemo, latestForBot, addBot for group threads.
- `convex/skills.ts` - skill CRUD: saveFromTool, listForBot, remove, internal forBots for the agent loop.
- `convex/demo.ts` - demo workspace seeding, the scripted chats the reset cron restores, the demo.config query the app reads for its demo posture, and the demo mode cleanup that clears idle visitor content.
- `convex/lib/moderation.ts` - server side content checks: profanity everywhere, links and length caps in demo mode; checkText throws user facing ConvexErrors.
- `convex/lib/rateLimits.ts` - demo only send and bot creation limits over the @convex-dev/rate-limiter component.
- `convex/reminders.ts` - sendDue internal mutation: sweeps bots with due reminders and pushes notifications, honoring the global toggle.
- `convex/crons.ts` - two 5 minute crons: demo chat reset and reminder delivery.
- `convex/messages.ts` - send (moderated and rate limited server side), list with bot attribution, plus internal history/createAssistant/appendContent/setToolCalls/finish for the agent loop.
- `convex/agent.ts` - the agent loop action; persona pass per bot with a shared transcript so bots respond to each other, provider adapters for Anthropic and OpenAI compatible APIs (incl. Concentrate gateway), BYOK per request with an optional server side demo key fallback (DEMO_LLM_*).
- `convex/tools/merge.ts` - merge_list tool over the Merge unified API: tickets, candidates, contacts, invoices, employees, files.
- `convex/tools/runware.ts` - runware_generate_image tool: text to image through Runware, returns a URL.
- `convex/tools/types.ts` - Tool contract: definition, available, execute, and the ToolContext passed to executions.
- `convex/tools/skills.ts` - skill_import tool: saves pasted text or a Firecrawl read URL as a skill on a named bot.
- `convex/tools/memory.ts` - remember tool: appends a note to the bot's durable memory.
- `convex/tools/firecrawl.ts` - web scrape and search tools through the @firecrawl/firecrawl-convex component, gated on FIRECRAWL_API_KEY.
- `convex/tools/agentmail.ts` - email send and list tools over the @agentmail/convex component; durable sends via email.sendFromTool.
- `convex/email.ts` - AgentMail component client, sendFromTool internal mutation, and the status query the settings screen reads.
- `convex/firecrawl.ts` - Firecrawl component client, firecrawlConfigured helper (placeholder aware), and the status query the settings screen reads.
- `convex/http.ts` - HTTP router; the AgentMail inbound webhook, served at /api/agentmail/webhook since the app's routes live under the /api prefix.
- `convex/push.ts` - push token recording and run finished notifications via the pushNotifications component.
- `convex/files.ts` - upload URL generation and file URL query for attachments; refuses upload URLs when DEMO_MODE=true so the public demo stays text only.
- `convex.config.ts` - installs @convex-dev/expo-push-notifications, @agentmail/convex, @convex-dev/rate-limiter, @firecrawl/firecrawl-convex (typed env, webhook at /firecrawl/), and two @convex-dev/static-hosting instances (landing at /, demoApp at /app/); app HTTP routes move under /api.

## landing

- `index.html` - static greyred landing page: compact copy card for the setup prompt (full text hidden in the DOM), app screenshots that link to the demo app, a run it on your phone section with a locally rendered QR code for the web demo, feature list, Convex components list, Convex and Expo benefits, demo reset note; repo links via REPO_URL (hidden until set) and demo links via DEMO_URL (defaults to /app/ for Convex hosting); below 720px the nav collapses into a menu button and right side drawer.
- `docs.html` - the App docs page: a newbie level setup and how it works guide (fork, Convex backend, Expo app, keys, tools, agent loop, deploy, hosting on Convex, troubleshooting) compiled from README and docs/, same greyred style and REPO_URL/DEMO_URL conventions; the mobile drawer also lists every page section.
- `qrcode.min.js` - vendored qrcode-generator library (MIT); renders the demo QR client side, no external image service.
- `screens/home.png`, `screens/chat.png`, `screens/settings.png` - mobile screenshots of the running app (roster, demo group chat, BYOK settings) shown on the landing page.

## docs

- `setup.md` - local dev, web preview, coding agent anonymous mode, EAS path, env vars.
- `one-prompt-setup.md` - the single prompt that sets up the repo via any coding agent.
- `github.md` - publish the template to GitHub and mark it a template repo.
- `agent-mode.md` - how the agent loop, tools, and streaming work.
- `byok.md` - key handling rules.
- `auth.md` - Convex Auth migration plan (not wired yet).
- `push-notifications.md` - push component setup and development build notes.
- `file-uploads.md` - Convex storage flow for attachments.
- `integrations.md` - workspace tool setup: Firecrawl, AgentMail, Merge, Runware.
- `design.md` - design tokens, UI direction, and the greyred landing page style.
- `deploy.md` - EAS Build, EAS Submit, Convex production, pointer to static hosting for the web pieces.
- `static-hosting.md` - hosting the landing page, web demo, and API on one Convex deployment via @convex-dev/static-hosting: layout, wiring, deploy scripts, QR, custom domains.
- `demo-mode.md` - the public demo posture: DEMO_MODE env var, locked key UI, moderation, rate limits, cleanup sweep, server side demo key, and how forks turn it all off.

## prds

- `expo-demo-PRD.md` - the working PRD for this template.
- `grok-style-bots-ui.md` - PRD for the multi bot chat UI and light theme.
- `gateway-tools-and-about.md` - PRD for Concentrate BYOK, Merge and Runware tools, and the About screen.
- `at-mentions.md` - PRD for @mention parsing and routing.
- `demo-skills-reminders-landing.md` - PRD for the posed demo, skills, memory, reminders, and the landing page.
- `avatars-search-ui.md` - PRD for PNG bot avatars, full text search, and Beautiful UI updates.
- `agentmail-component.md` - PRD for adopting the official @agentmail/convex component.
- `landing-screenshots-prompt.md` - PRD for the compact setup prompt card and landing page screenshots.
- `landing-app-docs-page.md` - PRD for the App docs page on the landing site.
- `convex-site-hosting.md` - PRD for serving the landing page and web demo from the Convex deployment via static hosting.
- `demo-mode-hardening.md` - PRD for demo mode: locked keys, moderation, rate limits, public banners, and cleanup.
