# Push notifications

expo-demo notifies users when an agent run finishes while the app is in the background. It uses the official Convex component for Expo push.

## What the component gives you

`@convex-dev/expo-push-notifications` handles the annoying parts: batching up to 100 notifications per request to Expo's push service, retries with backoff, receipt tracking, and pruning expired or invalid tokens. You write two calls: record a token, send a notification.

Component page: https://www.convex.dev/components/push-notifications

## How it is wired here

Backend (`packages/backend/convex/push.ts`):

- The component is registered in `convex.config.ts`.
- `recordPushToken` mutation stores the device's Expo push token against the user.
- `notifyRunFinished` is called at the end of an agent run and sends "Your agent finished" with the thread title. It passes `allowUnregisteredTokens: true` so users who never granted push permission are a silent no-op. Since component 0.3 the default is to throw for missing tokens.
- `sendTest` keeps the throwing default on purpose: a clear error beats silence when you are testing.

App (`apps/native/lib/push.ts`):

- Asks notification permission, fetches the Expo push token with `expo-notifications`, and calls `recordPushToken`.
- A tap on the notification deep links to the thread via expo-router.

## Requirements

- Push does not work in Expo Go on Android, and iOS needs a real device. Build a development build: `eas build --profile development`.
- iOS needs your push credentials set up in EAS (`eas credentials`). Android uses FCM through Expo's service.

## Testing

Send yourself a test from the backend:

```bash
cd packages/backend
npx convex run push:sendTest '{"deviceId": "<your-device-id>"}'
```

Your device ID shows at the bottom of the Settings screen.
