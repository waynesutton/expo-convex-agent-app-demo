# Agent mode

How a message becomes an agent run, and how tool calls show up in the chat.

## The loop

1. The user sends a message. The app calls the `sendMessage` mutation (writes the user message) and then the `agent.runAgent` action with the thread ID, provider, model, and the user's API key.
2. The action loads the thread history through an internal query and creates an assistant message with status `streaming`.
3. It calls the provider's chat API with the system prompt, history, and tool definitions.
4. If the model returns text, the action appends it to the assistant message through an internal mutation. The UI updates instantly because the message query is reactive.
5. If the model returns a tool call, the action records it on the message (the UI renders a tool card), executes the tool, feeds the result back to the model, and continues. Max 6 tool iterations per run.
6. When the model stops, the message status flips to `done`. If the app is backgrounded, a push notification fires.

No websocket code exists in the app. Convex reactivity is the transport.

## Tools

Defined in `packages/backend/convex/tools/`:

| Tool | What it does | Needs |
|---|---|---|
| `firecrawl_scrape` | Fetch a URL as clean markdown | `FIRECRAWL_API_KEY` |
| `firecrawl_search` | Search the web, return results with content | `FIRECRAWL_API_KEY` |
| `agentmail_send` | Send an email from the app's inbox | `AGENTMAIL_API_KEY` |
| `agentmail_list` | List recent messages in the inbox | `AGENTMAIL_API_KEY` |

Tools whose keys are missing stay out of the tool list, and the system prompt tells the model they are unavailable. The agent degrades, it does not crash.

## Adding a tool

1. Create `convex/tools/yourtool.ts` exporting a definition (name, description, JSON schema) and an `execute` function.
2. Register it in the tool registry in `convex/agent.ts`.
3. Done. The chat UI renders any tool call generically as a mono card with name, input, and output.

## Streaming tradeoff

V0.1 appends text in chunks through mutations. Simple, visible, slightly chatty. When you want token level streaming, swap in the Convex Persistent Text Streaming component and keep the same message schema. The upgrade path is noted inline in `agent.ts`.

## System prompt

Lives in `convex/agent.ts` as `SYSTEM_PROMPT`. It tells the model what tools exist, to show its reasoning briefly, and to keep answers mobile length. Edit it like product copy, because it is.
