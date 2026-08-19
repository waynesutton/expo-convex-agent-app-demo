"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Tool, ToolContext } from "./tools/types";
import { firecrawlScrape, firecrawlSearch } from "./tools/firecrawl";
import { agentmailSend, agentmailList } from "./tools/agentmail";
import { mergeList } from "./tools/merge";
import { runwareGenerateImage } from "./tools/runware";
import { skillImport } from "./tools/skills";
import { rememberNote } from "./tools/memory";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// The agent loop. One action per user message.
// BYOK rule: args.apiKey is used for the provider request and nothing else.
// It is never written to the database and never logged. Keep it that way.
//
// Streaming note: v0.1 writes model output per iteration through
// messages.appendContent, and the reactive query updates the UI. For token
// level streaming, swap in the Persistent Text Streaming component:
// https://www.convex.dev/components/persistent-text-streaming
// ---------------------------------------------------------------------------

const MAX_TOOL_ITERATIONS = 6;

const BASE_PROMPT = `Keep answers tight; this is a phone screen. When you use a tool, say what you did in one line. If a tool is unavailable, say so and continue with what you know. Never invent tool output. If the user pastes a link or a block of text that reads like reusable instructions, offer to save it with the skill_import tool, for you or a named teammate. Use the remember tool for durable facts worth keeping between conversations.`;

// Persona prompt for a named bot. When teammates share the thread, the bot
// knows who they are and can hand work to them by name. Saved memory and
// imported skills extend the persona.
function personaPrompt(
  bot: { name: string; purpose: string; memory?: string },
  teammates: Array<{ name: string; purpose: string }>,
  skills: Array<{ name: string; instructions: string }>
): string {
  let prompt = `You are ${bot.name}, an AI teammate. Your job: ${bot.purpose}. ${BASE_PROMPT}`;
  if (teammates.length > 0) {
    const roster = teammates.map((t) => `${t.name} (${t.purpose})`).join("; ");
    prompt += ` You share this thread with other bots: ${roster}. The user summons a specific bot by writing @Name; when a message @mentions you, it is yours to handle. Read teammate replies, build on them instead of repeating, and address teammates as @Name when handing off work. Stay in your lane; if a request fits a teammate's job better, say so briefly.`;
  }
  if (bot.memory) {
    prompt += `\n\nNotes you saved earlier:\n${bot.memory}`;
  }
  for (const skill of skills) {
    prompt += `\n\nSkill: ${skill.name}\n${skill.instructions}`;
  }
  return prompt;
}

// One map to update when providers ship new models. Concentrate is an LLM
// gateway (https://concentrate.ai): one key reaches every major model through
// an OpenAI compatible API, so it rides the same adapter as OpenAI and xAI.
const PROVIDERS = {
  anthropic: { defaultModel: "claude-sonnet-4-6" },
  openai: { defaultModel: "gpt-5" },
  xai: { defaultModel: "grok-4" },
  openrouter: { defaultModel: "anthropic/claude-sonnet-4-6" },
  concentrate: { defaultModel: "claude-sonnet-4-6" },
} as const;

type ProviderName = keyof typeof PROVIDERS;

// Register tools here. See convex/tools/types.ts for the contract.
const TOOL_REGISTRY: Tool[] = [
  firecrawlScrape,
  firecrawlSearch,
  agentmailSend,
  agentmailList,
  mergeList,
  runwareGenerateImage,
  skillImport,
  rememberNote,
];

export const runAgent = action({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    provider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("xai"),
      v.literal("openrouter"),
      v.literal("concentrate")
    ),
    model: v.optional(v.string()),
    // Device-held BYOK key; per request only. Optional so the hosted demo
    // can run on a server key: when absent and DEMO_MODE=true, the action
    // uses DEMO_LLM_PROVIDER / DEMO_LLM_API_KEY / DEMO_LLM_MODEL env vars.
    // The server key never leaves this action and is never logged.
    apiKey: v.optional(v.string()),
    // Bots that respond to this message, in order. Each sees the replies of
    // the bots before it, so they build on each other's work. Empty or absent
    // falls back to a single unnamed agent (pre-bot threads).
    botIds: v.optional(v.array(v.id("bots"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Resolve the key. A client key wins; without one, demo mode falls back
    // to the host's server key and the client-picked provider is ignored so
    // the key only ever reaches the provider it belongs to.
    let provider = args.provider as ProviderName;
    let apiKey: string = args.apiKey ?? "";
    let model = args.model;
    if (!apiKey) {
      const demoKey = process.env.DEMO_LLM_API_KEY;
      if (process.env.DEMO_MODE === "true" && demoKey) {
        apiKey = demoKey;
        const envProvider = process.env.DEMO_LLM_PROVIDER;
        provider =
          envProvider && envProvider in PROVIDERS
            ? (envProvider as ProviderName)
            : "openrouter";
        model = process.env.DEMO_LLM_MODEL ?? undefined;
      } else {
        throw new Error(
          "No API key available. Add one in Settings, or set DEMO_LLM_API_KEY on the deployment for demo mode."
        );
      }
    }
    const resolvedModel = model ?? PROVIDERS[provider].defaultModel;
    const tools = TOOL_REGISTRY.filter((t) => t.available());

    const bots: Array<{
      _id: Id<"bots">;
      name: string;
      purpose: string;
      memory?: string;
    }> = args.botIds && args.botIds.length > 0
      ? await ctx.runQuery(internal.bots.getMany, { botIds: args.botIds })
      : [];

    // Imported skills per bot, folded into each persona prompt below.
    const allSkills: Array<{
      botId: Id<"bots">;
      name: string;
      instructions: string;
    }> = bots.length > 0
      ? await ctx.runQuery(internal.skills.forBots, {
          botIds: bots.map((b) => b._id),
        })
      : [];

    const history = await ctx.runQuery(internal.messages.history, {
      threadId: args.threadId,
    });
    const botNames = new Map(bots.map((b) => [b._id as string, b.name]));
    const multiBot = bots.length > 1;

    // Provider-neutral running transcript, shared across the group run. In a
    // group thread, assistant messages carry the author's name so models can
    // tell the bots apart and respond to each other.
    const transcript: TranscriptItem[] = history.map((m) => {
      if (m.role === "assistant" && multiBot) {
        const name = m.botId ? (botNames.get(m.botId) ?? "Bot") : "Bot";
        return { role: m.role, content: `${name}: ${m.content}` };
      }
      return { role: m.role, content: m.content };
    });

    // One pass per bot (or one unnamed pass). Each pass has its own message
    // document and tool call log.
    const passes = bots.length > 0 ? bots : [null];
    for (const bot of passes) {
      const teammates = bot ? bots.filter((b) => b._id !== bot._id) : [];
      const botSkills = bot
        ? allSkills.filter((s) => s.botId === bot._id)
        : [];
      const system = bot
        ? personaPrompt(bot, teammates, botSkills)
        : `You are the assistant in expo-demo, a mobile agent chat app. ${BASE_PROMPT}`;

      // Context handed to tools that touch app data (skill_import, remember).
      const toolContext: ToolContext = {
        ctx,
        userId: args.userId,
        threadId: args.threadId,
        botId: bot?._id,
        botName: bot?.name,
      };

      const messageId: Id<"messages"> = await ctx.runMutation(
        internal.messages.createAssistant,
        { threadId: args.threadId, userId: args.userId, botId: bot?._id }
      );
      const toolCallLog: ToolCallRecord[] = [];
      let replyText = "";

      // This bot's private working copy. Tool chatter stays here; only the
      // finished reply lands in the shared transcript for the next bot.
      const passTranscript: TranscriptItem[] = [...transcript];

      try {
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
          const result = await callProvider(
            provider,
            resolvedModel,
            apiKey,
            system,
            passTranscript,
            tools
          );

          if (result.text) {
            await ctx.runMutation(internal.messages.appendContent, {
              messageId,
              chunk: result.text,
            });
            replyText += result.text;
          }

          if (!result.toolCall) break;

          // Surface the running tool call in the UI before executing it.
          const record: ToolCallRecord = {
            name: result.toolCall.name,
            input: JSON.stringify(result.toolCall.input),
            status: "running",
          };
          toolCallLog.push(record);
          await ctx.runMutation(internal.messages.setToolCalls, {
            messageId,
            toolCalls: toolCallLog,
          });

          const tool = tools.find(
            (t) => t.definition.name === result.toolCall!.name
          );
          let output: string;
          try {
            output = tool
              ? await tool.execute(result.toolCall.input, toolContext)
              : `Tool ${result.toolCall.name} is not available.`;
            record.status = "done";
          } catch (err) {
            output = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
            record.status = "error";
          }
          record.output = output.slice(0, 4000);
          await ctx.runMutation(internal.messages.setToolCalls, {
            messageId,
            toolCalls: toolCallLog,
          });

          // Tool results stay visible to this bot for its next iteration.
          passTranscript.push({ role: "assistant", content: result.text });
          passTranscript.push({
            role: "tool",
            content: output,
            toolName: result.toolCall.name,
            toolCallId: result.toolCall.id,
          });
        }

        await ctx.runMutation(internal.messages.finish, {
          messageId,
          status: "done",
        });
      } catch (err) {
        await ctx.runMutation(internal.messages.finish, {
          messageId,
          status: "error",
          errorText: `Run failed: ${err instanceof Error ? err.message : "unknown error"}`,
        });
      }

      // Hand the finished reply to the next bot in the round.
      if (replyText) {
        transcript.push({
          role: "assistant",
          content:
            bot && multiBot ? `${bot.name}: ${replyText}` : replyText,
        });
      }
    }

    // Notify if the app is backgrounded. Component handles delivery details.
    await ctx.runMutation(internal.push.notifyRunFinished, {
      userId: args.userId,
      threadId: args.threadId,
    });
    return null;
  },
});

// ---------------------------------------------------------------------------
// Provider adapters. Anthropic speaks its own Messages API; OpenAI, xAI, and
// OpenRouter all speak OpenAI-compatible chat completions.
// ---------------------------------------------------------------------------

type TranscriptItem = {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolCallId?: string;
};

type ToolCallRecord = {
  name: string;
  input: string;
  output?: string;
  status: "running" | "done" | "error";
};

type ProviderResult = {
  text: string;
  toolCall?: { id: string; name: string; input: Record<string, unknown> };
};

async function callProvider(
  provider: ProviderName,
  model: string,
  apiKey: string,
  system: string,
  transcript: TranscriptItem[],
  tools: Tool[]
): Promise<ProviderResult> {
  if (provider === "anthropic") {
    return callAnthropic(model, apiKey, system, transcript, tools);
  }
  const baseUrl =
    provider === "openai"
      ? "https://api.openai.com/v1"
      : provider === "xai"
        ? "https://api.x.ai/v1"
        : provider === "concentrate"
          ? "https://api.concentrate.ai/v1"
          : "https://openrouter.ai/api/v1";
  return callOpenAICompatible(baseUrl, model, apiKey, system, transcript, tools);
}

async function callAnthropic(
  model: string,
  apiKey: string,
  system: string,
  transcript: TranscriptItem[],
  tools: Tool[]
): Promise<ProviderResult> {
  const messages = transcript.map((item) => {
    if (item.role === "tool") {
      return {
        role: "user" as const,
        content: [
          {
            type: "tool_result",
            tool_use_id: item.toolCallId ?? "call_0",
            content: item.content,
          },
        ],
      };
    }
    return { role: item.role, content: item.content };
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages,
      tools: tools.map((t) => ({
        name: t.definition.name,
        description: t.definition.description,
        input_schema: t.definition.parameters,
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();

  let text = "";
  let toolCall: ProviderResult["toolCall"];
  for (const block of data.content ?? []) {
    if (block.type === "text") text += block.text;
    if (block.type === "tool_use" && !toolCall) {
      toolCall = { id: block.id, name: block.name, input: block.input ?? {} };
    }
  }
  return { text, toolCall };
}

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  system: string,
  transcript: TranscriptItem[],
  tools: Tool[]
): Promise<ProviderResult> {
  const messages: Record<string, unknown>[] = [
    { role: "system", content: system },
  ];
  for (const item of transcript) {
    if (item.role === "tool") {
      messages.push({
        role: "tool",
        tool_call_id: item.toolCallId ?? "call_0",
        content: item.content,
      });
    } else {
      messages.push({ role: item.role, content: item.content });
    }
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: tools.map((t) => ({
        type: "function",
        function: {
          name: t.definition.name,
          description: t.definition.description,
          parameters: t.definition.parameters,
        },
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Provider API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0]?.message ?? {};

  let toolCall: ProviderResult["toolCall"];
  const rawCall = choice.tool_calls?.[0];
  if (rawCall) {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(rawCall.function?.arguments ?? "{}");
    } catch {
      // Model produced malformed JSON args; run the tool with empty input.
    }
    toolCall = { id: rawCall.id, name: rawCall.function?.name ?? "", input };
  }
  return { text: choice.content ?? "", toolCall };
}
