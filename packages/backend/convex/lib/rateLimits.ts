import { ConvexError } from "convex/values";
import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";
import { MutationCtx } from "../_generated/server";
import { isDemoMode } from "./moderation";

// Anti-spam rate limits, built on the official @convex-dev/rate-limiter
// component. Enforced only when DEMO_MODE=true, so a private fork is never
// throttled. Buckets are per user (per device install, until auth lands).
const rateLimiter = new RateLimiter(components.rateLimiter, {
  sendMessage: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 15 },
  createBot: { kind: "token bucket", rate: 6, period: HOUR },
});

type LimitName = "sendMessage" | "createBot";

const LIMIT_COPY: Record<LimitName, string> = {
  sendMessage: "You are sending messages too fast for the demo. Wait a moment and try again.",
  createBot: "Bot creation is limited in the demo. Try again in a bit, or fork the template.",
};

// Throws a user-facing ConvexError when the demo bucket is empty.
export async function enforceDemoLimit(
  ctx: MutationCtx,
  name: LimitName,
  key: string
): Promise<void> {
  if (!isDemoMode()) return;
  const { ok } = await rateLimiter.limit(ctx, name, { key });
  if (!ok) throw new ConvexError(LIMIT_COPY[name]);
}
