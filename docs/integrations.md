# Workspace tools: Firecrawl, AgentMail, Merge, Runware

Four workspace tools the agent can use. All are optional; the agent runs without them and simply reports the tool as unavailable. Every bot in every thread gets the same tool registry, so a tool you enable here works with all of your agents. Firecrawl and AgentMail run through their official Convex components; Merge and Runware are direct API calls.

## Firecrawl (web scraping and search)

Firecrawl turns any URL into clean markdown and runs web searches that return page content, which is exactly what a model wants. This template uses the official [`@firecrawl/firecrawl-convex` component](https://www.convex.dev/components/firecrawl/firecrawl-convex), mounted in `convex/convex.config.ts`, instead of raw API calls. That buys you:

- Typed calls to the Firecrawl v2 API from the Convex runtime, no `"use node"` and no bundled SDK.
- Retries with backoff on transient failures (408, 429, 5xx), honoring `Retry-After`.
- Structured errors. A `ConvexError` carries `{ code, status, message }`, so out of credits (402) reads differently from rate limited (429).
- A path to durable site crawls. The component's `startCrawl` tracks a whole crawl in your database with reactive progress queries. The template does not start crawls, but the webhook route is already mounted at `/firecrawl/webhook`, so a fork can add them without config work.

Setup:

```bash
cd packages/backend
npx convex env set FIRECRAWL_API_KEY fc-...
```

Get a key at https://firecrawl.dev. One quirk to know: the component declares `FIRECRAWL_API_KEY` as required, so the variable must exist before a deploy succeeds. No key yet? Set the placeholder once and everything deploys clean:

```bash
npx convex env set FIRECRAWL_API_KEY unset
```

With the placeholder in place the app treats Firecrawl as not configured: the tools stay out of the model's tool list and nothing calls the API. The Settings screen shows Configured or Not configured, never the key.

The component client lives in `convex/firecrawl.ts`; the tool wrappers in `convex/tools/firecrawl.ts` call it. Two tools are exposed to the model:

- `firecrawl_scrape(url)`: one page, markdown out
- `firecrawl_search(query)`: web search with content

Skill import (`convex/tools/skills.ts`) reads URLs through the same client when the key is set. Option names pass through to the [Firecrawl v2 API](https://docs.firecrawl.dev) untouched, so their docs are the reference.

## AgentMail (email for agents)

AgentMail gives your agent its own inbox: programmatic email addresses built for AI agents rather than humans clicking through OAuth. This template uses the official [`@agentmail/convex` component](https://www.npmjs.com/package/@agentmail/convex), mounted in `convex/convex.config.ts`, instead of raw API calls. That buys you:

- Durable sending. `agentmail_send` enqueues through a Convex mutation; the component's workpool delivers with bounded retries, and delivery status (`pending`, `sent`, `delivered`, `bounced`) is a reactive query.
- Inbound mail as state. With the webhook set up, every received message lands in the component's own tables (Svix verified, deduped by event id) and any `useQuery` over it updates live.
- Isolation. The component's tables (inboxes, inboundMessages, outboundMessages, events) are sandboxed from app data.

Setup:

```bash
cd packages/backend
npx convex env set AGENTMAIL_API_KEY <key>
# the inbox id is the inbox email address, e.g. yourbot@agentmail.to
npx convex env set AGENTMAIL_INBOX_ID <inbox email>
# optional, enables inbound mail via the webhook
npx convex env set AGENTMAIL_WEBHOOK_SECRET whsec_...
```

Get a key and create an inbox at https://agentmail.to. The Settings screen in the app shows whether AgentMail is configured and which inbox address your bots send from; keys stay in Convex env vars (the component reads them from the environment so they never appear in function args or logs).

For inbound mail, register `https://<your-deployment>.convex.site/api/agentmail/webhook` in the AgentMail dashboard and set the secret above. The route is defined in `convex/http.ts` and served under `/api` because `convex.config.ts` gives the static hosting component the site root (see `docs/static-hosting.md`). It is inert until the secret is set.

Tools exposed to the model:

- `agentmail_send(to, subject, body)`: durable send from the app's inbox
- `agentmail_list()`: recent threads in the inbox

The tool file is `convex/tools/agentmail.ts`; the component client and the send mutation live in `convex/email.ts`. See https://docs.agentmail.to for the API reference.

## Merge (unified API for business tools)

Merge is one API over HRIS, ATS, CRM, ticketing, accounting, and file storage integrations. Your bots can answer questions like "how many open tickets do we have" or "list this week's candidates" against whatever tools the workspace has connected.

Setup:

```bash
cd packages/backend
npx convex env set MERGE_API_KEY <key>
npx convex env set MERGE_ACCOUNT_TOKEN <token>
```

Get an API key from the Merge dashboard. The account token comes from linking an integration through Merge Link; each linked account has its own token, so pick the one your bots should read. Both must be set or the tool stays unavailable.

Tool exposed to the model:

- `merge_list(category, resource)`: ten records from a category endpoint, e.g. `ticketing/tickets`, `crm/contacts`, `hris/employees`

The tool file is `convex/tools/merge.ts` with the category and resource allowlist at the top. See https://docs.merge.dev/merge-unified/overview for the API reference. If you need more categories or write operations, extend the allowlist there.

## Runware (image generation)

Runware is one API for AI media generation across hundreds of models. Bots use it to create images on request and reply with the image URL.

Setup:

```bash
cd packages/backend
npx convex env set RUNWARE_API_KEY <key>
```

Get a key at https://runware.ai. Tool exposed to the model:

- `runware_generate_image(prompt)`: 1024x1024 image, returns a URL

The tool file is `convex/tools/runware.ts`. The default model is FLUX.1 dev (`runware:101@1`); swap the constant for any model id from https://runware.ai/models. Runware's API is task based, so adding video or upscale later is the same POST with a different task type. See https://runware.ai/docs.

## Why workspace level, not BYOK

LLM keys are user identity, so they stay on device (that includes gateway keys like Concentrate and OpenRouter). Firecrawl, AgentMail, Merge, and Runware are app capabilities, like your database: one operator key, set once, used by every run. Mixing the two models confuses both. If you later need per user inboxes or per user Merge accounts, add the id to the users table and pass it through the tool call.

## Adding your own integration

Copy the shape of `merge.ts`: a `definition` (name, description, JSON schema the model sees) and an `execute` (the fetch). Register it in the registry in `agent.ts`. The UI needs zero changes; tool cards render generically. If an official component exists for the service, use it like `firecrawl.ts` and `agentmail.ts` do; check https://www.convex.dev/components first.
