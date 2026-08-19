import { Tool } from "./types";
import { internal } from "../_generated/api";

// Bot memory. A bot saves short notes that persist across threads and are
// folded into its persona prompt (see ../agent.ts). Memory is capped in
// bots.appendMemory so prompts stay small. Users can review and clear it
// on the bot settings screen.

export const rememberNote: Tool = {
  definition: {
    name: "remember",
    description:
      "Save a short note to your persistent memory. Use for durable facts about the user, their preferences, or ongoing work you should not forget between conversations. One sentence per note.",
    parameters: {
      type: "object",
      properties: {
        note: { type: "string", description: "The note to remember" },
      },
      required: ["note"],
    },
  },
  available: () => true,
  execute: async (input, context) => {
    const note = String(input.note ?? "").trim();
    if (!note) return "Nothing to remember: note was empty.";
    if (!context.botId) {
      return "No bot persona is active in this thread, so there is nowhere to save memory.";
    }
    await context.ctx.runMutation(internal.bots.appendMemory, {
      botId: context.botId,
      note,
    });
    return `Remembered: ${note}`;
  },
};
