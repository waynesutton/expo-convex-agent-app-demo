import { Tool } from "./types";
import { firecrawl, firecrawlConfigured } from "../firecrawl";

// Firecrawl: URL to markdown, and web search with content, through the
// official @firecrawl/firecrawl-convex component (mounted in
// ../convex.config.ts, client in ../firecrawl.ts). The component owns the
// HTTP plumbing: typed v2 API options, retries with backoff on transient
// failures, and ConvexErrors carrying { code, status, message } so a 402
// (out of credits) reads differently from a 429. Docs:
// https://www.convex.dev/components/firecrawl/firecrawl-convex

export const firecrawlScrape: Tool = {
  definition: {
    name: "firecrawl_scrape",
    description:
      "Fetch a single web page and return its content as clean markdown. Use for reading a specific URL the user mentioned or one found via search.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The full URL to fetch" },
      },
      required: ["url"],
    },
  },
  available: firecrawlConfigured,
  execute: async (input, context) => {
    const doc = await firecrawl.scrape(context.ctx, String(input.url), {
      formats: ["markdown"],
      onlyMainContent: true,
    });
    const markdown = doc.markdown ?? JSON.stringify(doc);
    // Keep tool output mobile sized; the model does not need 200KB of page.
    return markdown.slice(0, 12000);
  },
};

export const firecrawlSearch: Tool = {
  definition: {
    name: "firecrawl_search",
    description:
      "Search the web and return top results with page content. Use when the user asks about current events or anything you are unsure about.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  available: firecrawlConfigured,
  execute: async (input, context) => {
    const results = await firecrawl.search(context.ctx, String(input.query), {
      limit: 5,
    });
    return JSON.stringify(results.web ?? results).slice(0, 12000);
  },
};
