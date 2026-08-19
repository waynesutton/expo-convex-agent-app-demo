// AgentMail: an inbox for your agent, through the official Convex component
// (@agentmail/convex). Sends are durable: the component enqueues from a
// mutation and a workpool delivers with retries. Inbound mail arrives via the
// webhook in ../http.ts. Docs: https://docs.agentmail.to
//
// Env vars (set with `npx convex env set` in packages/backend):
//   AGENTMAIL_API_KEY    required
//   AGENTMAIL_INBOX_ID   the inbox email address, required for these tools
//   AGENTMAIL_WEBHOOK_SECRET  optional, enables inbound mail

import { Tool } from "./types";
import { internal } from "../_generated/api";
import { agentmail, agentmailConfigured, agentmailInbox } from "../email";

export const agentmailSend: Tool = {
  definition: {
    name: "agentmail_send",
    description:
      "Send an email from the app's inbox. Confirm recipient, subject, and body with the user before sending.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string" },
        body: { type: "string", description: "Plain text email body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  available: agentmailConfigured,
  execute: async (input, context) => {
    // Enqueues the send via the component; a workpool delivers with retries.
    const outboundId: string = await context.ctx.runMutation(
      internal.email.sendFromTool,
      {
        to: String(input.to),
        subject: String(input.subject),
        body: String(input.body),
      }
    );
    return JSON.stringify({
      queued: true,
      from: agentmailInbox(),
      outboundId,
      note: "Delivery is handled with retries; status is tracked in Convex.",
    });
  },
};

export const agentmailList: Tool = {
  definition: {
    name: "agentmail_list",
    description:
      "List recent email threads in the app's inbox. Use when the user asks about received email or replies.",
    parameters: { type: "object", properties: {}, required: [] },
  },
  available: agentmailConfigured,
  execute: async (_input, context) => {
    const inbox = agentmailInbox();
    if (!inbox) throw new Error("AGENTMAIL_INBOX_ID is not set");
    const data = await agentmail.listThreads(context.ctx, inbox, {
      limit: 10,
    });
    return JSON.stringify(data).slice(0, 12000);
  },
};
