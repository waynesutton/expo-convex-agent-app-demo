# BYOK: bring your own key

expo-demo does not ship with a model API key and does not proxy your usage through anyone's account. Users paste their own key once, on their own device.

## Supported providers

| Provider | Key prefix | Default model |
|---|---|---|
| Anthropic | `sk-ant-` | claude-sonnet-4-6 |
| OpenAI | `sk-` | gpt-5 |
| xAI | `xai-` | grok-4 |
| OpenRouter | `sk-or-` | anthropic/claude-sonnet-4-6 |
| Concentrate | varies | claude-sonnet-4-6 |

Model IDs live in `packages/backend/convex/agent.ts` in one map. Update them there when providers ship new models.

Concentrate and OpenRouter are gateways: one key reaches every major model through an OpenAI compatible API. Concentrate adds no platform fee and supports fallback chains you configure on their side; get a key at https://concentrate.ai. Pick a gateway when you want to switch models without juggling keys per provider.

## How keys move

1. The user pastes a key in Settings. It is written to expo-secure-store (Keychain on iOS, Keystore on Android).
2. When the user sends a message, the app reads the key from secure store and includes it in the `runAgent` action call over HTTPS.
3. The Convex action uses the key for the provider request, then returns. The key is a function argument, gone when the action ends.

## The rules

- Keys are never written to the database. There is no `apiKey` field in the schema on purpose.
- Keys are never logged. No `console.log` of action args in the agent path.
- Keys are never sent to any endpoint except the provider the user chose.
- Removing a key in Settings deletes it from secure store immediately.

## Why not store keys server side?

Storing user keys in the backend makes you a custodian of credentials you do not need. Device storage means a lost phone is the user's blast radius, not your database. The tradeoff: users enter the key once per device. Acceptable.

Workspace tools (Firecrawl, AgentMail) are different. Those keys belong to the app operator, so they live as Convex environment variables. See `docs/integrations.md`.
