# Landing site app docs page

Created: 2026-08-17 03:45 UTC
Last Updated: 2026-08-17 03:55 UTC
Status: Done

## Problem

The landing page links to the Convex and Expo docs but the template's own documentation lives only in the repo's docs folder. Someone who lands on the page and wants to fork has to leave for GitHub to learn how setup works. There is no single newbie friendly page that walks the whole path: fork, backend, app, keys, how the app works, deploy.

## Proposed solution

A second static file, landing/docs.html, in the same greyred style. Content is compiled from README.md and docs/ (setup, byok, integrations, agent-mode, github, deploy, push-notifications) and written for someone who has never used Expo or Convex:

1. What this is (architecture and monorepo map)
2. What you need (prerequisites, with why)
3. Get your copy (template vs fork, clone)
4. Set up the backend (npx convex dev explained, anonymous agent mode, EAS integration path)
5. Run the app (env file, expo start, Expo Go, web preview)
6. Add your model key (BYOK providers, how keys move, the rules)
7. Optional workspace tools (Firecrawl, AgentMail, Merge, Runware env vars)
8. How the app works (agent loop, demo reset cron, mentions, groups, skills, memory, reminders, search, avatars, app rename)
9. Make it yours (rename checklist, REPO_URL, DEMO_URL, landing hosting)
10. Ship it (convex deploy, EAS build and submit, push requirements, OTA)
11. When things break (troubleshooting table)
12. The rules (auth path, key handling, no polling)

index.html changes: nav and footer gain an "App docs" link next to Demo; the hero "Read the docs" ghost button points at docs.html.

## Files to change

- landing/docs.html (new)
- landing/index.html (nav, footer, hero docs button)
- files.md, changelog.md, task.md

## Edge cases

- REPO_URL and DEMO_URL conventions repeat on the docs page nav; same hidden-until-set behavior via shared constants.
- Relative link docs.html works from any host since both files sit in landing/.
- Page must read fine with no JavaScript; the script only wires optional links and copy buttons.

## Verification

- Serve landing/ locally, open docs.html: nav works, sections render, on page links jump, code blocks and tables styled.
- index.html: App docs link visible, Read the docs button goes to docs.html.

## Task completion log

- 2026-08-17 03:45 UTC Created.
- 2026-08-17 03:55 UTC Done. docs.html shipped with 12 sections, TOC, code blocks, tables, and a troubleshooting matrix. index.html nav and footer link App docs; the hero Read the docs button opens the page. Verified in browser: nav state, anchors, hidden repo/demo links, code and table rendering, screenshots still 200.
