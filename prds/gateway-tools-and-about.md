# Concentrate BYOK, Merge and Runware tools, About screen

Created: 2026-08-16 23:35 UTC
Last Updated: 2026-08-16 23:50 UTC
Status: Done

## Problem

The template supports four direct model providers for BYOK and two workspace tools. Users asked for three more services, plus a way to reach the project docs from inside the app:

1. Concentrate.ai, an LLM gateway with an OpenAI compatible API and zero markup.
2. Merge.dev, a unified API over HRIS, ATS, CRM, ticketing, accounting, and file storage integrations.
3. Runware.ai, one API for image, video, and media generation.
4. An About screen that links to the README and docs.

## Approach

Each service maps to the pattern it fits, nothing more:

- Concentrate is a chat completions gateway, so it becomes the fifth BYOK provider. Same key handling as the other four: device keychain, per request, never stored.
- Merge and Runware are capabilities, not user identity. They follow the Firecrawl and AgentMail pattern: workspace tools keyed by Convex env vars, exposed to every bot through the tool registry. Any bot in any thread can call them, which covers "work with any and all agents."
- About is a modal screen. It explains the template, links the README and docs on GitHub through a REPO_URL constant the developer sets after publishing, and always links Convex and Expo docs.

OpenMausBot relevance check: its BYOK key handling (write only keys, "keys once, everything lights up") matches what we already do. Its computer-use, Composio, voice, and Electron harness are out of scope for a Convex plus Expo template.

## Files to change

- `packages/backend/convex/agent.ts`: concentrate in PROVIDERS, args validator, baseUrl branch; register merge and runware tools.
- `packages/backend/convex/tools/merge.ts` (new): merge_list tool over the unified API.
- `packages/backend/convex/tools/runware.ts` (new): runware_generate_image tool.
- `apps/native/lib/keys.ts`: concentrate in Provider and PROVIDERS.
- `apps/native/lib/links.ts` (new): REPO_URL and doc links in one place.
- `apps/native/app/about.tsx` (new): about modal.
- `apps/native/app/_layout.tsx`: register about route.
- `apps/native/app/settings.tsx`: About row.
- `README.md`, `docs/byok.md`, `docs/integrations.md`: document all three.

## Edge cases

- Missing MERGE or RUNWARE env vars: tools report unavailable, agent continues (existing pattern).
- Merge requires two credentials (API key plus account token); tool is unavailable unless both exist.
- Model passes a bad Merge category: tool validates against an allowlist and returns an error string instead of throwing the run.
- Runware output stays a URL, not bytes, so tool output fits the 4000 char cap.
- REPO_URL unset: About hides the GitHub rows and shows a one line hint instead of dead links.

## Verification

- `npx convex dev --once` deploys clean.
- `npm run typecheck` (or tsc) passes in both workspaces.
- Settings shows five provider chips; concentrate key saves and loads.
- About modal opens from Settings and links resolve.

## Task completion log

- 2026-08-16 23:35 UTC PRD created.
- 2026-08-16 23:50 UTC Done. Concentrate provider, merge and runware tools, About modal, docs updated. Convex deploys clean, both workspaces typecheck, five chips and About verified in browser.
