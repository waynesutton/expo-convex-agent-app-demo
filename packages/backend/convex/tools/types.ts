// Shared shape for agent tools. Copy firecrawl.ts to add your own, then
// register it in the registry in ../agent.ts. The UI renders any tool call
// generically, so no client changes are needed.

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export type ToolDefinition = {
  name: string;
  description: string;
  // JSON schema for the tool input, in the shape provider APIs expect.
  parameters: Record<string, unknown>;
};

// Passed to every tool execution. Tools that only call external APIs can
// ignore it; tools that touch app data (skills, memory) use ctx to run
// internal mutations and queries.
export type ToolContext = {
  ctx: ActionCtx;
  userId: Id<"users">;
  threadId: Id<"threads">;
  botId?: Id<"bots">;
  botName?: string;
};

export type Tool = {
  definition: ToolDefinition;
  // Return value is stringified and fed back to the model.
  execute: (
    input: Record<string, unknown>,
    context: ToolContext
  ) => Promise<string>;
  // Tools with missing keys are excluded from the model's tool list.
  available: () => boolean;
};
