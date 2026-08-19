import { mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { isDemoMode } from "./lib/moderation";

// Step 1 of upload: the client asks for a short lived URL, POSTs the file to
// it, and gets a storageId back. That id rides on messages.send as an
// attachment. See docs/file-uploads.md.
//
// The public demo is text only: no upload URLs are issued when
// DEMO_MODE=true, which closes both photo paths (chat attachments and bot
// avatars) at the source. Forks without the env var are unaffected.
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    if (isDemoMode()) {
      throw new ConvexError(
        "Photo uploads are off in this public demo. Fork the template to enable them."
      );
    }
    return await ctx.storage.generateUploadUrl();
  },
});
