import { defineApp } from "convex/server";
import { v } from "convex/values";
import pushNotifications from "@convex-dev/expo-push-notifications/convex.config";
import agentmail from "@agentmail/convex/convex.config";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import firecrawl from "@firecrawl/firecrawl-convex/convex.config";

// httpPrefix moves the app's own HTTP routes (convex/http.ts) under /api so
// the static hosting component can own the site root. The AgentMail webhook
// is therefore served at /api/agentmail/webhook.
//
// The env block declares deployment vars we pass into the Firecrawl
// component by reference. The component requires FIRECRAWL_API_KEY to exist
// before a push succeeds. No key yet? Set the placeholder once and the
// template deploys clean, with the Firecrawl tools held out of the model's
// tool list (see convex/firecrawl.ts):
//   npx convex env set FIRECRAWL_API_KEY unset
// Swap in a real fc-... key from https://firecrawl.dev when you have one.
const app = defineApp({
  httpPrefix: "/api",
  env: {
    FIRECRAWL_API_KEY: v.string(),
    FIRECRAWL_WEBHOOK_SECRET: v.optional(v.string()),
  },
});
app.use(pushNotifications);
app.use(agentmail);
// Anti-spam buckets for the public demo (convex/lib/rateLimits.ts). The
// component is idle unless DEMO_MODE=true is set on the deployment.
app.use(rateLimiter);
// Firecrawl scrape and search for the agent tools (convex/firecrawl.ts).
// The webhook prefix only matters for durable crawls, which the template
// does not start; it is mounted so a fork that adds startCrawl works as is.
app.use(firecrawl, {
  httpPrefix: "/firecrawl/",
  env: {
    FIRECRAWL_API_KEY: app.env.FIRECRAWL_API_KEY,
    FIRECRAWL_WEBHOOK_SECRET: app.env.FIRECRAWL_WEBHOOK_SECRET,
  },
});

// Two static sites on one deployment (see docs/static-hosting.md):
// - staticHosting serves landing/ at the root. Deployed with --no-spa
//   because it is a real multi-page site (index.html, docs.html).
app.use(staticHosting, { httpPrefix: "/" });
// - demoApp serves the Expo web export under /app/ with SPA fallback so
//   expo-router client routes survive a reload.
app.use(staticHosting, { name: "demoApp", httpPrefix: "/app/" });

export default app;
