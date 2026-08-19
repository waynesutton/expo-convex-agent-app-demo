# Setup

Get expo-demo running locally, then wire it to EAS when you are ready to build binaries.

## Prerequisites

- Node 20 or newer, npm 10 or newer
- Expo Go on your phone, or an iOS simulator / Android emulator
- A Convex account (free, created on first `npx convex dev` if you do not have one)

## Local development

```bash
npm install

# Terminal 1: backend
cd packages/backend
npx convex dev
```

First run walks you through Convex login and project creation, then generates `convex/_generated` and prints your deployment URL. Leave it running; it watches your functions and pushes changes live.

The Firecrawl component requires `FIRECRAWL_API_KEY` to exist before a push succeeds. No real key needed:

```bash
npx convex env set FIRECRAWL_API_KEY unset
```

```bash
# Terminal 2: app
cd apps/native
cp .env.example .env.local
# set EXPO_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
npx expo start
```

Scan the QR code with Expo Go. Push notifications need a development build (`docs/push-notifications.md`), everything else works in Expo Go.

### Web preview

Want to poke at the UI without a phone? Install the web deps once, then start with the web flag:

```bash
cd apps/native
npx expo install react-native-web react-dom
npx expo start --web
```

Key storage falls back to localStorage on web (secure-store is native only) and push registration is skipped. Web is for previewing; ship the native app.

## Coding agents: zero login setup

Cloud agents and unattended local agents cannot click through a Convex login. Anonymous agent mode gives them an isolated local deployment with no account:

```bash
cd packages/backend
CONVEX_AGENT_MODE=anonymous npx convex dev
```

This downloads a local Convex backend binary, serves it at `http://127.0.0.1:3210`, writes `.env.local` in `packages/backend`, and runs a local dashboard. Point the app at it:

```bash
# apps/native/.env.local
EXPO_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
```

Everything works: schema push, codegen, components, reactive queries. When a human takes over, run plain `npx convex dev`, log in, and swap the URL for the cloud deployment. Agent mode is beta; see https://docs.convex.dev/cli/agent-mode.

## The EAS path

If you already use EAS, one command replaces the manual provisioning:

```bash
npm install -g eas-cli
eas init                                  # link or create the EAS project
eas integrations:convex:connect           # provision Convex, write env vars
```

This creates the Convex project, writes `CONVEX_DEPLOY_KEY` and `EXPO_PUBLIC_CONVEX_URL` to `.env.local`, and sets `EXPO_PUBLIC_CONVEX_URL` across your EAS environments (production, preview, development). The Convex dashboard invite arrives by email; claim it to get full access.

Related commands: `eas integrations:convex:dashboard`, `:project`, `:team`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_CONVEX_URL` | `apps/native/.env.local` and EAS envs | The app's Convex endpoint. Public by design. |
| `FIRECRAWL_API_KEY` | Convex env (`npx convex env set`) | Must exist at push. Use `unset` until you have a real key. |
| `AGENTMAIL_API_KEY` | Convex env (`npx convex env set`) | Email tool. Optional. |

Never put secrets in `EXPO_PUBLIC_` variables. They ship inside the app bundle.

## Next steps

- Paste a model key in the app's Settings screen (`docs/byok.md`)
- Understand the agent loop (`docs/agent-mode.md`)
- Ship it (`docs/deploy.md`)
