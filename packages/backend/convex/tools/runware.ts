import { Tool } from "./types";

// Runware: one API for AI media generation across hundreds of models.
// Docs: https://runware.ai/docs
// The API is task based: POST an array of tasks, get an array of results.
// v0.1 exposes image generation; add video or upscale tasks the same way.
const RUNWARE_BASE = "https://api.runware.ai/v1";

// FLUX.1 dev on Runware. Swap for any model id from https://runware.ai/models.
const DEFAULT_MODEL = "runware:101@1";

function key(): string | undefined {
  return process.env.RUNWARE_API_KEY;
}

export const runwareGenerateImage: Tool = {
  definition: {
    name: "runware_generate_image",
    description:
      "Generate an image from a text prompt and return its URL. Use when the user asks you to create, draw, or visualize an image. Include the URL in your reply so the user can open it.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "What the image should show, in plain descriptive language",
        },
      },
      required: ["prompt"],
    },
  },
  available: () => Boolean(key()),
  execute: async (input) => {
    const res = await fetch(RUNWARE_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          taskType: "imageInference",
          taskUUID: crypto.randomUUID(),
          positivePrompt: String(input.prompt),
          model: DEFAULT_MODEL,
          width: 1024,
          height: 1024,
          numberResults: 1,
          outputType: "URL",
          outputFormat: "JPEG",
        },
      ]),
    });
    if (!res.ok) {
      throw new Error(`Runware failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const imageUrl: string | undefined = data?.data?.[0]?.imageURL;
    if (!imageUrl) {
      throw new Error(`Runware returned no image: ${JSON.stringify(data).slice(0, 400)}`);
    }
    return `Image generated: ${imageUrl}`;
  },
};
