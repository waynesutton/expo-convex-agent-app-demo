import { Tool, ToolContext } from "./types";
import { internal } from "../_generated/api";
import { firecrawl, firecrawlConfigured } from "../firecrawl";

// Skill importer. The user pastes a link or a block of instructions in any
// chat, and the bot saves it as a named skill for itself or a teammate.
// Skills feed into the bot's persona prompt on every run (see ../agent.ts).
// URLs go through the Firecrawl component when FIRECRAWL_API_KEY is set,
// plain fetch otherwise, so the tool works with zero workspace keys.

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

async function fetchSource(url: string, context: ToolContext): Promise<string> {
  if (firecrawlConfigured()) {
    try {
      const doc = await firecrawl.scrape(context.ctx, url, {
        formats: ["markdown"],
        onlyMainContent: true,
      });
      if (doc.markdown) return doc.markdown;
    } catch {
      // Fall through to plain fetch on any Firecrawl hiccup.
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const text = await res.text();
  // Crude tag strip keeps raw HTML from flooding the skill body.
  return text.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
}

export const skillImport: Tool = {
  definition: {
    name: "skill_import",
    description:
      "Save a reusable skill (instructions the bot follows from now on) from a URL or pasted text. Use when the user shares a link or a block of instructions and wants a bot to learn it. Target the current bot by default, or a named teammate.",
    parameters: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "A URL to read the skill from, or the pasted skill text itself",
        },
        name: {
          type: "string",
          description: "Short name for the skill, e.g. 'Weekly report format'",
        },
        bot: {
          type: "string",
          description:
            "Optional teammate name to save the skill to. Omit to save to yourself.",
        },
      },
      required: ["source", "name"],
    },
  },
  available: () => true,
  execute: async (input, context) => {
    const source = String(input.source ?? "").trim();
    const name = String(input.name ?? "Imported skill");
    const targetBotName = input.bot ? String(input.bot) : undefined;
    if (!source) return "Nothing to import: source was empty.";

    let instructions = source;
    let sourceUrl: string | undefined;
    if (looksLikeUrl(source)) {
      sourceUrl = source;
      instructions = (await fetchSource(source, context)).slice(0, 8000);
    }

    const result: string = await context.ctx.runMutation(
      internal.skills.saveFromTool,
      {
        userId: context.userId,
        currentBotId: context.botId,
        targetBotName,
        name,
        instructions,
        sourceUrl,
      }
    );
    return result;
  },
};
