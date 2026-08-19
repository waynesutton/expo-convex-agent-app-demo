# Deploy to the App Store

From working prototype to TestFlight, with the Convex production deployment wired correctly.

Shipping the landing page and the web demo is a separate, smaller flow: `npm run site:deploy` from the repo root hosts both on your Convex deployment. See [`static-hosting.md`](static-hosting.md).

## 1. Point production at production

Your `npx convex dev` deployment is for development. Production is separate:

```bash
cd packages/backend
npx convex deploy
```

If you connected through `eas integrations:convex:connect`, the `EXPO_PUBLIC_CONVEX_URL` variable is already set per EAS environment. Confirm the production environment points at the production Convex URL in your EAS project settings, and set your tool keys on the production deployment too:

```bash
npx convex env set FIRECRAWL_API_KEY fc-... --prod
npx convex env set AGENTMAIL_API_KEY am-... --prod
```

Secrets live in Convex env vars, never in `EXPO_PUBLIC_` variables. Anything `EXPO_PUBLIC_` ships inside the binary.

## 2. Build

```bash
cd apps/native
eas build --platform ios
eas build --platform android
```

Reminders:

- Push notifications and any native modules need these real builds, not Expo Go.
- iOS credentials: `eas credentials` walks you through certs and push keys.
- Set the bundle identifier and package name in `app.json` before your first build.

## 3. Submit

Configure the submit profile in `eas.json` (add your `ascAppId` for iOS, service account key and track for Android), then:

```bash
eas submit --platform ios
eas submit --platform android
```

iOS lands in TestFlight first. Test push and file upload there before release.

## 4. Ship the web demo and landing page

The store build is the product; the web export is the instant preview people reach from the landing page QR. One command deploys the backend to production and uploads both static sites to your production `.convex.site` URL:

```bash
npm run site:deploy   # from the repo root
```

Details, paths, and the dev preview flow are in [`static-hosting.md`](static-hosting.md).

## 5. OTA updates later

JS only changes can ship over the air with `eas update` once you set up channels. Pair each update channel with the matching Convex deployment so app code and backend functions move together. EAS Workflows can run `npx convex deploy` and `eas update` in one pipeline; that is the roadmap CI story.

## App review notes

- If you add any third party sign in later, Apple requires Sign in with Apple as an option. That is why the auth plan starts there (`docs/auth.md`).
- BYOK apps should explain in the App Store description that users supply their own model API key.
