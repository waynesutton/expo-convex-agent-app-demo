# Firecrawl component adoption

Created: 2026-08-17 06:25 UTC
Last Updated: 2026-08-17 06:45 UTC
Status: Done

## Problem

The template calls the Firecrawl REST API by hand (`convex/tools/firecrawl.ts` and the URL fetch inside `convex/tools/skills.ts`), and Settings gives no signal that Firecrawl is configured. The official `@firecrawl/firecrawl-convex` component exists and the repo rule says use official components before hand rolled infrastructure. AgentMail already follows that rule; Firecrawl should match.

## Root cause

The tools were written before the component shipped (component published 2026-08-07). Nothing was wrong, it was just older than the ecosystem.

## Proposed solution

- Install `@firecrawl/firecrawl-convex` and mount it in `convex.config.ts` with the webhook prefix `/firecrawl/` (route precedence keeps it clear of the static hosting root, same as `/app/`).
- New `convex/firecrawl.ts` mirroring `convex/email.ts`: one `FirecrawlClient`, a `firecrawlConfigured()` helper, and a `status` query for the Settings screen. Never exposes the key.
- Rewrite `tools/firecrawl.ts` to call `client.scrape` and `client.search` through the component (typed client, retries with backoff, structured ConvexErrors). Same tool names, same model-facing contract, so nothing else changes.
- `tools/skills.ts` URL reads go through the same client, keeping the plain fetch fallback for zero key installs.
- Settings gains a Firecrawl card like the AgentMail one: Configured / Not configured plus setup commands.
- Docs sync: integrations.md, README components list, landing pages, files.md, changelog.md, task.md.

Out of scope, documented as an upgrade: durable `startCrawl` site crawls with reactive progress. The chat tools only need one-shot scrape and search today.

Also requested and declined: the WorkOS auth skill attached to the request. AGENTS.md hard rule 1 says Convex Auth only, so no WorkOS wiring.

## Files to change

- packages/backend/package.json (dependency)
- packages/backend/convex/convex.config.ts
- packages/backend/convex/firecrawl.ts (new)
- packages/backend/convex/tools/firecrawl.ts
- packages/backend/convex/tools/skills.ts
- apps/native/app/settings.tsx
- docs/integrations.md, README.md, landing/index.html, landing/docs.html
- files.md, changelog.md, task.md

## Edge cases

- No key set: `available()` stays false, tools drop out of the model's list, skill import falls back to plain fetch, Settings shows Not configured. Zero key installs behave exactly as before.
- Component errors carry `{ code, status, message }`; tool wrappers surface the message to the model like any tool error.
- The webhook route is only needed for durable crawls, which the template does not start; mounting it is harmless and ready for forks that add crawls.

## Verification steps

1. Both workspaces typecheck.
2. `npx convex dev --once` mounts the component clean.
3. Settings shows the Firecrawl card (Not configured on the demo deployment).
4. `site:preview` republishes the web demo; browser check confirms the card.

## Task completion log

- 2026-08-17 06:25 UTC: PRD created, implementation started.
- 2026-08-17 06:35 UTC: Discovered the component declares FIRECRAWL_API_KEY as required typed env; optional parent binding is rejected at push and a required var must exist before a push succeeds. Adopted the placeholder convention: `npx convex env set FIRECRAWL_API_KEY unset` deploys clean and `firecrawlConfigured()` treats it as not configured.
- 2026-08-17 06:45 UTC: Done. Component mounted (webhook at /firecrawl/webhook verified live alongside static hosting), tools and skill import rewired, Settings card added, docs and landing synced, both workspaces typecheck, site republished.
