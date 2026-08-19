# Auth plan: Convex Auth, not yet wired

expo-demo ships without authentication so you can prototype without an identity system in the way. When auth lands, it will be Convex Auth. This is a decision, not a default.

## The rule

Convex Auth only. Better Auth, Clerk, and WorkOS are not options for this template. If you fork and want them, that is your repo. PRs adding them here get closed. The reasons:

- One vendor. Your data and your identities live in the same system, with no second dashboard, webhook sync, or extra bill.
- Convex Auth supports React Native, stores sessions in your own tables, and works with expo-secure-store for token storage.
- Fewer moving parts for the one prompt setup. An auth provider signup step breaks "fork and run."

Convex Auth is in beta. That is acceptable for a template; verify current status at https://docs.convex.dev/auth/convex-auth before shipping to production.

## How identity works today

A `deviceId` is generated once per install and stored in expo-secure-store (`apps/native/lib/keys.ts`). The `users.ensureUser` mutation upserts a user row keyed by that ID. Every thread, message, and push token hangs off `userId`.

This means: no sign in screen, no passwords, and your data is scoped to a device. Delete the app, lose the thread history. Fine for a prototype, not for production.

## The migration path (when you wire it)

1. Install `@convex-dev/auth` and run its setup in `packages/backend`.
2. Add sign in with Apple first. If your iOS app offers any third party login, App Store review requires Apple's. Then add email OTP or others.
3. Wrap the app in `ConvexAuthProvider` with a secure-store token storage adapter.
4. Migrate device users: on first sign in, claim the existing `deviceId` user row and attach the authenticated identity to it. The schema already keys everything by `userId`, so this is a data move, not a rewrite.
5. Lock down functions: replace `deviceId` args with `ctx.auth.getUserIdentity()` checks.

The schema was shaped for this from day one. That is why every table carries `userId` even though there is no login screen yet.
