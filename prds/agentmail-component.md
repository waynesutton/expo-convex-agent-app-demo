# Adopt the @agentmail/convex component

Created: 2026-08-17 02:00 UTC
Last Updated: 2026-08-17 02:10 UTC
Status: Done

## Problem

The AgentMail tools in `convex/tools/agentmail.ts` are raw fetches against the
AgentMail REST API. That predates the official Convex component. Rule 4 of
this repo says check the components directory before hand building; the
official `@agentmail/convex` component exists and gives us:

- Durable sending: send enqueues from a mutation, a workpool action delivers
  with bounded retries, and delivery status is a reactive query.
- Idempotent webhook ingest (Svix verified) so inbound mail lands in Convex
  tables reactively instead of being fetched on demand.
- Isolated component tables (inboxes, inboundMessages, outboundMessages,
  events) sandboxed from app data.

Also: the app settings screen says nothing about AgentMail. Users cannot see
whether the inbox is configured or what its address is.

## Proposed solution

- Install `@agentmail/convex` (and its `convex-helpers` peer) in
  packages/backend and mount it in `convex.config.ts`.
- New `convex/email.ts`: the `AgentMail` client over `components.agentmail`,
  an internal `sendFromTool` mutation the send tool calls (durable path), and
  a public `status` query returning `{ configured, inbox }` for settings.
- New `convex/http.ts`: `/agentmail/webhook` route via
  `agentmail.handleWebhook` for inbound mail (active once
  AGENTMAIL_WEBHOOK_SECRET is set; optional otherwise).
- Rewrite `convex/tools/agentmail.ts` to route send through the component
  (durable) and list threads through the component client instead of raw
  fetches.
- Settings screen gains a read only Workspace tools card: AgentMail
  configured or not, the inbox email when set, and where the keys live. Keys
  stay Convex env vars (the component reads env directly so keys never appear
  in function args or logs); only LLM keys are BYOK on device.

Env vars: AGENTMAIL_API_KEY (required), AGENTMAIL_INBOX_ID (the inbox email
address, required for tools), AGENTMAIL_WEBHOOK_SECRET (optional, inbound).

## Files to change

- packages/backend/package.json (add @agentmail/convex, convex-helpers)
- packages/backend/convex/convex.config.ts (app.use(agentmail))
- packages/backend/convex/email.ts (new)
- packages/backend/convex/http.ts (new)
- packages/backend/convex/tools/agentmail.ts (component backed)
- apps/native/app/settings.tsx (workspace tools card)
- docs/integrations.md, README.md, landing/index.html (component lists)
- files.md, changelog.md, task.md

## Edge cases

- No AGENTMAIL_API_KEY: tools report unavailable, status query returns
  configured false, settings card shows not configured. Nothing throws.
- Webhook route without AGENTMAIL_WEBHOOK_SECRET: only fails if something
  posts to it, which cannot happen before the URL is registered.
- The send tool runs inside the agent action; it calls the internal mutation
  via ctx.runMutation so the component enqueue happens transactionally.

## Verification

- npx convex dev deploys clean with the component mounted.
- npx tsc --noEmit in both workspaces.
- Settings shows the AgentMail card (not configured in this dev deployment).

## Task completion log

- 2026-08-17 02:00 UTC Created.
- 2026-08-17 02:10 UTC Done. Component mounted (agentmail plus its send and
  callback workpools installed on the dev deployment), send tool routes
  through email.sendFromTool, list tool uses the component client, webhook
  mounted in http.ts, settings card verified in the browser (shows Not
  configured with setup commands). Both workspaces typecheck. Docs synced:
  integrations, README, landing page components list, files, changelog.
  Note: sendMessage types against a mutation ctx, so the tool goes through an
  internal mutation; handleWebhook is cast per the component's own httpAction
  example.
