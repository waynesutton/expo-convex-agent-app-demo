// Firecrawl wiring through the official Convex component
// (https://www.npmjs.com/package/@firecrawl/firecrawl-convex). The component
// runs in the Convex runtime and talks to the Firecrawl v2 REST API with
// typed options, structured ConvexErrors, and automatic retries on transient
// failures. The key is a deployment env var passed into the component by
// reference in convex.config.ts; it never appears in function args or logs.
//
// The chat tools use one-shot scrape and search (convex/tools/firecrawl.ts).
// The component also supports durable site crawls (startCrawl) with reactive
// progress queries if your fork needs them.

import { query } from "./_generated/server";
import { components } from "./_generated/api";
import { FirecrawlClient } from "@firecrawl/firecrawl-convex";
import { v } from "convex/values";

export const firecrawl = new FirecrawlClient(components.firecrawl);

// The component declares FIRECRAWL_API_KEY as required, so the var must
// exist before a push succeeds. Installs without a key set the documented
// placeholder ("unset"), which counts as not configured here: the tools stay
// out of the model's tool list and nothing ever calls the API with it.
export function firecrawlConfigured(): boolean {
  const key = process.env.FIRECRAWL_API_KEY;
  return Boolean(key && key !== "unset");
}

// Read-only status for the settings screen. A boolean and nothing else; no
// key material leaves the server.
export const status = query({
  args: {},
  returns: v.object({ configured: v.boolean() }),
  handler: async () => {
    return { configured: firecrawlConfigured() };
  },
});
