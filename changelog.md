# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- README sections for folder structure, Convex static hosting paths, the public Convex API the app calls, and GitHub plus Convex deploy of the landing page and native app (2026-08-19).

### Changed

- Setup is documented as keyless. The landing copy prompt, `docs/one-prompt-setup.md`, `AGENTS.md`, App docs prerequisites, and `docs/setup.md` all tell agents to use `CONVEX_AGENT_MODE=anonymous` when login is not possible, set `FIRECRAWL_API_KEY unset` (required env var, not a real key), and not to block on model or tool keys. Seeded chats browse without a model key (2026-08-19).
- `REPO_URL` now points at https://github.com/waynesutton/expo-convex-agent-app-demo in `apps/native/lib/links.ts`, `landing/index.html`, and `landing/docs.html` (2026-08-19).
- Landing page vertical spacing tightened so the hero and first section sit higher (2026-08-19).
- `docs/github.md` no longer says the folder is not a git repo; it points at the published template URL (2026-08-19).

### Added

- Mobile sidebar menu on both landing pages. Below 720px the nav link row hides behind a menu button that opens a right side drawer in the same greyred tokens: scrim overlay, body scroll lock, and it closes on the scrim, the close button, any link tap, or Escape, with reduced motion respected. The App docs drawer also lists every on this page section so long reads stay navigable mid scroll (2026-08-17 07:35 UTC).
- Optional step 8 in the landing setup prompt: publish the landing page and web demo by setting the prod env vars first, then `npm run site:deploy`. The docs page host section and `docs/static-hosting.md` document the same first deploy prerequisite: env vars are per deployment, so a fresh prod needs `npx convex env set FIRECRAWL_API_KEY unset --prod` before the first push succeeds (2026-08-17 07:20 UTC).

### Changed

- The app name is read-only in demo mode. Settings shows the current wordmark with a fork note instead of the rename input, and `users.setAppName` rejects renames server side (2026-08-17 06:58 UTC).
- The public demo is now text only. In demo mode the composer's photo attach button and the bot avatar upload links are hidden, and the backend enforces it in three places: `files.generateUploadUrl` refuses to issue upload URLs, `messages.send` rejects attachments, and `bots.setAvatar` rejects new images while still allowing clears. Forks without `DEMO_MODE` keep photo uploads exactly as before (2026-08-17 06:55 UTC).
- Text inputs no longer draw the browser focus ring on web. New `noFocusRing` style in `lib/theme.ts` (web only, no-op on native) applied to every TextInput: composer, settings key and app name fields, search, new bot, new group, and the reminder message editor (2026-08-17 06:55 UTC).

### Added

- Firecrawl through the official [firecrawl component](https://www.convex.dev/components/firecrawl/firecrawl-convex) (`@firecrawl/firecrawl-convex`), replacing hand rolled REST calls. New `convex/firecrawl.ts` holds the component client, a placeholder aware `firecrawlConfigured()` helper, and a `status` query. The `firecrawl_scrape` and `firecrawl_search` tools and the skill importer's URL reads now go through the component: typed v2 API options, retries with backoff on transient failures, and structured `ConvexError`s. The webhook route is mounted at `/firecrawl/webhook` so a fork can add durable site crawls with zero config work (2026-08-17 06:45 UTC).
- Firecrawl status card in Settings, matching the AgentMail one: Configured or Not configured plus setup commands, no key material ever shown (2026-08-17 06:45 UTC).

### Changed

- `FIRECRAWL_API_KEY` must now exist on the deployment before a push succeeds, because the component declares it as required typed env. Installs without a key run `npx convex env set FIRECRAWL_API_KEY unset` once; the app treats the placeholder as not configured and keeps the tools out of the model's tool list. Documented in the README, AGENTS.md setup flow, `docs/integrations.md`, and the landing setup prompt (2026-08-17 06:45 UTC).
- Landing components list now includes firecrawl-convex, static-hosting, and rate-limiter entries so it matches `convex.config.ts` (2026-08-17 06:45 UTC).

### Added

- Demo mode for public hosting, switched by one env var (`DEMO_MODE=true`). Settings replaces all key entry with a read only provider status card: the host configured provider is labeled Active and no part of any key is ever shown or sent to a client. Live replies run on a server side key (`DEMO_LLM_PROVIDER`, `DEMO_LLM_API_KEY`, optional `DEMO_LLM_MODEL`) that only the agent action reads; `agent.runAgent`'s `apiKey` arg is now optional and the client picked provider is ignored when the server key is used. New `demo.config` query, public demo banners on the home screen and every chat ("chats are public and reset every 5 minutes"), and a demo mode cleanup on the existing 5 minute cron that deletes idle visitor created bots, threads, and skills. Full guide in `docs/demo-mode.md`, including how forks turn it off and where the Convex Auth path lives (2026-08-17 06:15 UTC).
- Server side content moderation in `convex/lib/moderation.ts`, enforced in mutations so no client build can skip it: profanity is blocked in chats, bot names and purposes, thread titles, reminder messages, and the app name everywhere; demo mode additionally blocks links in messages and caps message length at 2,000 characters. Blocked input throws a `ConvexError` with user facing copy that the composer shows while keeping the draft (2026-08-17 06:15 UTC).
- Anti spam rate limits through the official [rate limiter component](https://www.convex.dev/components/rate-limiter) (`@convex-dev/rate-limiter`): 10 message sends per minute and 6 bot creations per hour per visitor, enforced only when `DEMO_MODE=true` so forks are never throttled (2026-08-17 06:15 UTC).
- Landing page link in the in app About screen, derived from `EXPO_PUBLIC_CONVEX_URL` (`.convex.cloud` to `.convex.site`) via the new `landingUrl()` helper in `lib/links.ts`, with a `LANDING_URL` override for custom domains (2026-08-17 06:15 UTC).
- `bots.by_demo` index so the demo cleanup sweeps visitor created bots without a table scan (2026-08-17 06:15 UTC).

### Changed

- Landing page reset note now says the demo chats are public and filtered, and the App docs page documents demo mode (2026-08-17 06:15 UTC).
- The chat screen's missing key warning became a general notice line that also surfaces moderation and rate limit rejections (2026-08-17 06:15 UTC).

### Added

- One URL hosting on Convex via the official [static hosting component](https://www.convex.dev/components/static-hosting): the landing site serves at the deployment root, the Expo web demo at `/app/` (SPA fallback, `experiments.baseUrl` in app.json, `build:web` env passthrough), and the backend's HTTP routes under `/api`. New `npm run site:preview` (dev) and `npm run site:deploy` (prod) scripts at the repo root, a run it on your phone section on the landing page with a QR code rendered locally by the vendored `qrcode.min.js` (MIT), `DEMO_URL` now defaults to `/app/`, a host it on Convex section on the App docs page, and a full guide in `docs/static-hosting.md` (2026-08-17 05:40 UTC).

### Changed

- The AgentMail inbound webhook URL moved from `/agentmail/webhook` to `/api/agentmail/webhook` since the static hosting component now owns the site root. Re-register the URL in the AgentMail dashboard if you had inbound mail wired (2026-08-17 05:40 UTC).

- App docs page on the landing site (`landing/docs.html`): a full setup and how it works guide for someone forking the template, written for a first timer. Covers the monorepo layout, prerequisites, template vs fork, `npx convex dev` explained step by step, anonymous agent mode, the EAS `integrations:convex:connect` path, running the app in Expo Go and on web, the BYOK provider table and key lifecycle, workspace tool env vars, the agent loop, the demo reset cron, mentions, groups, skills, memory, reminders, search, avatars, the fork rename checklist, production deploy, a troubleshooting table, and the repo rules. The home page nav, footer, and hero "Read the docs" button now point at it (2026-08-17 03:55 UTC).
- App rename for forks: an "App name" card in Settings writes `users.appName` (trimmed, 30 char cap, empty clears back to the default) and the home header and desktop sidebar wordmark render it reactively. Demo bots and chats are untouched; this renames the shell only. New `users.setAppName` mutation and `users.get` query (2026-08-17 03:40 UTC).
- "Why not the AI Agent, Workflow, or RAG components?" section in the README: the agent loop stays plain Convex on purpose so it reads as a lesson, with named upgrade paths (AI Agent, Persistent Text Streaming, Workflow, RAG, Batch Worker/Workpool) and the BYOK constraint explained. The landing page components section gains the same upgrade path line and the Expo list links the Expo guide to using Convex (2026-08-17 03:40 UTC).
- Demo app links on the landing page behind a new `DEMO_URL` constant, same convention as `REPO_URL`: an "Open the demo app" hero button, a Demo link in the nav and footer, and the three screenshots become links to the running app. Everything stays hidden or inert until `DEMO_URL` is set, so there are no dead links out of the box (2026-08-17 03:30 UTC).
- Landing page screenshots: three phone frames captured from the running web app (home roster, seeded demo chat, BYOK settings) in `landing/screens/`, lazy loaded with a fixed 375:640 aspect ratio so there is no layout shift, 3-up on desktop and stacked on phones (2026-08-17 02:22 UTC).

### Changed

- Landing page setup prompt is no longer displayed as a 300px scrolling block. The full prompt stays in the DOM (hidden) so both copy buttons still work; visitors now see a compact card with one line of context and a "Copy the setup prompt" button (2026-08-17 02:22 UTC).

### Fixed

- The "Fork it" hero button was visible with a dead `#` link before `REPO_URL` was set: the button's `display: inline-flex` overrode the HTML `hidden` attribute. A `[hidden] { display: none !important; }` rule restores the intended behavior for both the repo and demo links (2026-08-17 03:30 UTC).

### Added

- AgentMail through the official `@agentmail/convex` component: mounted in `convex.config.ts`, sends now enqueue via `email.sendFromTool` and a workpool delivers with bounded retries, delivery status is reactive, and inbound mail can land in Convex tables through the Svix verified webhook at `/agentmail/webhook` (`convex/http.ts`). The settings screen gains an AgentMail card showing configured state and the inbox email with setup commands when unset. New env var `AGENTMAIL_INBOX_ID` documented as the inbox email address; `AGENTMAIL_WEBHOOK_SECRET` optional for inbound (2026-08-17 02:10 UTC).
- PNG bot avatars in Convex file storage: upload a photo in bot settings (client and server both enforce PNG under 2 MB via the `_storage` system table), replace or remove it anytime. The avatar renders in the roster, sidebar, chat header, message bubbles, mention strip, and search results; rejected, replaced, and orphaned files are deleted so storage never leaks. New `bots.avatarId` field, `bots.setAvatar` mutation, and `avatarUrl` resolution across bot queries (2026-08-17 01:57 UTC).
- Full text search over bots, chats, and messages: magnifying glass next to the settings gear (home header and desktop sidebar) opens a search screen with live as-you-type results. Three Convex search indexes (`bots.search_name`, `threads.search_title`, `messages.search_content`), one `search.all` query, results ranked by relevance with prefix matching on the last term. New `app/search.tsx` and `convex/search.ts` (2026-08-17 01:57 UTC).
- Composer attachment preview: an attached image now shows as a thumbnail with a remove button instead of a text note, following the Beautiful UI prompt bar pattern (2026-08-17 01:57 UTC).

### Changed

- Palette moved to grey led tokens: app ground is now soft grey `#FAFAFA` (was pure white) so bot bubbles (`#F2F2F2`), inputs (`#EAEAEA`), and the ink user bubble read as distinct surfaces. Text tokens are now ink `#171717`, slate `#4D4D4D`, faint `#888888`; error red is `#EE0000`. Same token names, new values in `apps/native/lib/theme.ts` (2026-08-17 01:55 UTC).
- Bot identity colors rebuilt without purple: ink, graphite, slate, blue `#0070F3`, teal `#50E3C2`, amber `#F5A623`, coral `#FF4D4D`. Light colors draw a dark avatar initial via the new `botInitialColor` helper. Old keys (violet, green, orange, pink) fall back to ink; demo seeds updated (Chief of Staff ink, Coach teal) and existing dev deployment bots patched to new keys (2026-08-17 01:55 UTC).
- Quieter type: the wordmark drops to weight 400 and bot names, screen titles, and mention chips drop to 500 across the roster, sidebar, chat header, bubbles, and pickers. Landing page wordmark and headline lightened to match. Rules documented in `docs/design.md` (2026-08-17 01:55 UTC).
- Landing page tokens synced to the new app greys; the greyred accent stays the muted `#C03D2E` while the app's error red is now `#EE0000` (2026-08-17 01:55 UTC).

### Added

- Posed demo workspace: first open seeds Chief of Staff, Coach, and Research Bot with scripted chats plus a Monday planning group thread. A 5 minute Convex cron (`convex/crons.ts`, `convex/demo.ts`) resets demo chats to their script; `DemoBanner` explains the reset inside demo chats. Existing installs get the demo backfilled once via `demoSeededAt`, and deleted demo bots stay deleted (2026-08-17 01:10 UTC).
- Bot reminders: each bot holds one reminder (message, interval from 30 minutes to daily, on/off) edited in the new bot settings screen. A 5 minute cron (`convex/reminders.ts`) delivers due reminders as push notifications. Settings gains a global reminders toggle that silences everything without touching per bot schedules (2026-08-17 01:10 UTC).
- Skill importer: `skill_import` tool saves pasted instructions or a URL (read via Firecrawl when the key is set) as a named skill on the current bot or any teammate. Skills ride the persona prompt and are listed and removable in bot settings. New `skills` table and `convex/skills.ts` (2026-08-17 01:10 UTC).
- Bot memory: `remember` tool appends durable notes to the bot's system prompt; view or clear in bot settings (2026-08-17 01:10 UTC).
- Group chat creation: `threads.createGroup` mutation and `app/group/new.tsx` screen to start a chat with two or more bots; group icon on the home screen appears once you have two bots (2026-08-17 01:10 UTC).
- Bot settings screen (`app/bot/[id].tsx`): reminder controls, memory, skills, and delete with tap again confirmation. Cancel button on the new bot screen (2026-08-17 01:10 UTC).
- `ThinkingDots` streaming indicator: three breathing dots replace the "working" text in bot bubbles (2026-08-17 01:10 UTC).
- Static landing page `landing/index.html` in the greyred style: copyable setup prompt, feature list, Convex and Expo benefits, demo reset note, and links to repo and docs. Greyred documented in `docs/design.md` (2026-08-17 01:10 UTC).

### Changed

- README rewritten around the posed demo, groups, skills, memory, reminders, the landing page, and a linked list of Convex components in use (2026-08-17 01:10 UTC).

### Added

- @mentions for bots: type @ in the composer to get an autocomplete strip of your bots; mentioned bots respond in mention order while unmentioned bots stay quiet, and mentioning a bot that is not in the thread pulls it in first. Mentions render semibold in user bubbles and the persona prompt teaches bots the @Name convention. New `apps/native/lib/mentions.ts` with boundary safe parsing (emails like a@sage.com never trigger, longest name wins, one response per bot) (2026-08-17 00:40 UTC).

- Concentrate (concentrate.ai) as a fifth BYOK provider: an LLM gateway with an OpenAI compatible API, one key for every major model, same device only key rules (2026-08-16 23:50 UTC).
- `merge_list` workspace tool over the Merge unified API: bots can read tickets, candidates, contacts, invoices, employees, and files from connected business tools. Needs `MERGE_API_KEY` and `MERGE_ACCOUNT_TOKEN` (2026-08-16 23:50 UTC).
- `runware_generate_image` workspace tool: text to image through Runware, returns the image URL. Needs `RUNWARE_API_KEY` (2026-08-16 23:50 UTC).
- About screen (`app/about.tsx`) reachable from Settings: what the template is, links to the README, docs folder, Convex docs, and Expo docs. Repo links come from `REPO_URL` in `lib/links.ts`, set after publishing (2026-08-16 23:50 UTC).

- Bots as named teammates: `bots` table (name, identity color, job), bot roster home screen, create bot modal with color palette and live avatar preview (2026-08-16 23:35 UTC).
- Group threads: add a teammate bot to any thread; the agent loop gives each bot its own persona pass and bots read and respond to each other's replies (2026-08-16 23:35 UTC).
- Desktop sidebar on Expo web at widths of 900px and up: roster beside the chat, active bot highlighted, new bot button (2026-08-16 23:35 UTC).
- Phosphor icons via `phosphor-react-native` and `react-native-svg` (2026-08-16 23:35 UTC).
- `components/BotAvatar.tsx`, `components/BotSidebar.tsx`, `app/bot/new.tsx`, `lib/time.ts` (2026-08-16 23:35 UTC).

- Web preview support: key storage falls back to localStorage on web, push registration is skipped on web (2026-08-16).
- `react-native-web` and `react-dom` dependencies so `npx expo start --web` works out of the box (2026-08-16).
- `docs/github.md`: publish the template to GitHub, from `git init` to template repo settings (2026-08-16).
- Coding agent setup section in `docs/setup.md`: `CONVEX_AGENT_MODE=anonymous npx convex dev` for zero login provisioning, plus a web preview section (2026-08-16).
- Unattended agent fallback in the one prompt (`docs/one-prompt-setup.md`) (2026-08-16).
- Project tracking files: `task.md`, `changelog.md`, `files.md` (2026-08-16).

### Changed

- Convex updated from 1.27 to 1.44 in both workspaces, checked against the current docs and component directory (2026-08-17 00:05 UTC).
- `@convex-dev/expo-push-notifications` updated from 0.2 to 0.3.1. Behavior change handled: sends to users without a token now throw by default, so `notifyRunFinished` passes `allowUnregisteredTokens: true` to stay a silent no-op; `sendTest` keeps the throwing default for clear test feedback. Added `returns` validators to all push functions (2026-08-17 00:05 UTC).

### Added

- "Fork it and make it yours" section in the README: use as template vs fork, rename checklist, `REPO_URL`, backend provisioning, and deploy. The About screen (reached from Settings) gains a "Fork this template" row that deep links to it once `REPO_URL` is set (2026-08-17 00:00 UTC).

### Changed

- Renamed the template from Phalanx to expo-demo everywhere: package names (`@expo-demo/backend`, `@expo-demo/native`), imports, app.json (name, slug, scheme `expodemo`, bundle ids `com.yourcompany.expodemo`), secure store key prefixes (`expo-demo.*`), agent system prompt, push copy, docs, PRDs, LICENSE, and the Cursor rule file. `prds/phlax-PRD.md` is now `prds/expo-demo-PRD.md` (2026-08-16 23:55 UTC).
- Quiet typography across the app: the wordmark is monospace at 15 to 17 weight 600 instead of a large 800 headline, and every 700 or 800 weight settled to 600. Nothing renders big and bold (2026-08-16 23:55 UTC).
- `app.json` now declares light interface style and a white background to match the light-first theme (2026-08-16 23:55 UTC).
- `docs/design.md` and the PRD design section rewritten for the current light token set; the old dark bronze theme docs were stale (2026-08-16 23:55 UTC).
- Settings row label is now "About this template" (2026-08-16 23:55 UTC).

- Light mode is the default. New token set in `lib/theme.ts`: paper, mist, field, ink, slate, faint, signal, plus an eight color bot identity palette (2026-08-16 23:35 UTC).
- Chat restyled in the Grok Bot conversation grammar: user messages are ink bubbles on the right, bot messages sit in mist beside the bot's avatar with its name (2026-08-16 23:35 UTC).
- Composer is a rounded pill with a plus attach button and a circular ink send button; send disables while empty (2026-08-16 23:35 UTC).
- `agent.runAgent` accepts `botIds` and builds a persona system prompt per bot; assistant messages store the authoring bot (2026-08-16 23:35 UTC).
- All Convex functions now declare return validators (2026-08-16 23:35 UTC).
- Composer keeps the draft when a send is blocked by the missing API key guard; before, the text was cleared and lost (2026-08-16).
- `react-native` aligned to 0.79.6 and `react-native-safe-area-context` to 5.4.0 per `npx expo install --fix` (2026-08-16).
- README status updated from scaffold to verified running, with links to the GitHub guide and agent mode setup (2026-08-16).

### Verified

- Backend deploys clean on Convex 1.34: schema with three indexes, pushNotifications component installed, functions ready in under 500ms (2026-08-16).
- Both workspaces typecheck with no errors (2026-08-16).
- End to end demo on Expo web: user and threads created through the UI land in the Convex database, BYOK guard blocks sends without a key (2026-08-16).
