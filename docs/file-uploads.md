# File uploads

Attach images to messages and set PNG bot avatars. Convex file storage does the heavy lifting.

## The flow

1. The user taps the attach button in the composer and picks an image with `expo-image-picker`.
2. The app calls the `files.generateUploadUrl` mutation to get a short lived upload URL.
3. The app POSTs the file to that URL and gets back a `storageId`.
4. The `storageId` rides along on `sendMessage` and lands in the message's `attachments` array.
5. The message query resolves each `storageId` to a serving URL with `ctx.storage.getUrl`, so bubbles render images directly.

No S3 buckets, no signed URL middleware, no CDN config. Convex storage serves the files.

## Bot avatars

Bot settings uses the same flow with two extra rules: the file must be a PNG and at most 2 MB. The client checks both before uploading, and the `bots.setAvatar` mutation checks again against the `_storage` system table (`ctx.db.system.get` returns `contentType` and `size`). A rejected upload is deleted on the spot, a replaced avatar frees the old file, and deleting a bot deletes its avatar. Queries resolve `avatarId` to a serving URL so the image renders in the roster, sidebar, chat header, bubbles, and search results.

## Vision

If the selected model supports images, the agent action downloads attachments and includes them in the provider request. Anthropic and OpenAI vision models read them natively; the code path is in `agent.ts` and marked clearly.

## Limits worth knowing

- Keep uploads reasonable for mobile: the composer resizes images to max 2048px before upload.
- Convex storage quotas depend on your plan; check the dashboard.
- For large media libraries later, the Convex R2 component is the upgrade path.
