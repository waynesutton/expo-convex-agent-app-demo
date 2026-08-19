# App rename setting, components rationale, Expo Convex guide link

Created: 2026-08-17 03:35 UTC
Last Updated: 2026-08-17 03:40 UTC
Status: Done

## Problem

Three gaps:

1. The README and landing page list the two components we use but never explain why the template does not use the other official ones (AI Agent, Workflow, Batch Worker, RAG, Persistent Text Streaming). Fork owners reasonably ask.
2. The landing page links to Convex and Expo docs but not to the Expo guide for using Convex (docs.expo.dev/guides/using-convex), which is the page that documents `eas integrations:convex:connect`.
3. A fork owner cannot rebrand the app. The wordmark reads expo-demo in the home header, sidebar, and about screen with no way to change it without editing code.

## Proposed solution

1. Add a "Component upgrade paths" note to the README components section and a line on the landing page: the agent loop, crons, and chunked streaming are plain Convex on purpose so the template stays readable; each has a named component upgrade when an app outgrows it (AI Agent, Workflow, Persistent Text Streaming, RAG, Batch Worker).
2. Add the Expo Convex guide link to the landing page Expo list and footer.
3. App rename for forks: new optional `appName` on the users table, `users.setAppName` mutation (trimmed, 30 char cap, empty clears back to expo-demo), `users.get` query by id. Settings gains an "App name" card. The home header and desktop sidebar wordmark render the custom name. Demo content (bots, threads, scripts) is untouched; this renames the shell only.

## Files to change

- packages/backend/convex/schema.ts (users.appName)
- packages/backend/convex/users.ts (setAppName, get, appName in getByDevice)
- apps/native/app/settings.tsx (App name card)
- apps/native/app/index.tsx (brand from user.appName)
- apps/native/components/BotSidebar.tsx (brand from user.appName)
- landing/index.html (Expo guide link, components note)
- README.md (component upgrade paths)
- files.md, changelog.md, task.md

## Edge cases

- Empty or whitespace name clears appName so the wordmark falls back to expo-demo.
- Names longer than 30 chars are rejected client side and truncated server side.
- Sidebar and header read from the same users row, so both update reactively on save.
- Demo seeds never touch appName; reset cron unaffected.

## Verification

- npx convex dev deploys clean; both workspaces typecheck.
- Browser: rename in settings, header and sidebar update live, clearing restores expo-demo.
- Landing page: Expo guide link present and correct.

## Task completion log

- 2026-08-17 03:35 UTC Created.
- 2026-08-17 03:40 UTC Done. users.appName + setAppName + get shipped; rename card in settings; header and sidebar wordmark read the custom name. Verified in browser: renamed to acme-bots (header updated live, demo bots untouched), reload seeded the field, clearing restored expo-demo and the database shows appName absent for every user. Convex deploys clean, both workspaces typecheck. README gains the component upgrade paths section; landing page links the Expo Convex guide and the same upgrade paths.
