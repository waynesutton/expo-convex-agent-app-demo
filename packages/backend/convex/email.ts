// AgentMail wiring through the official Convex component
// (https://www.npmjs.com/package/@agentmail/convex). The component owns its
// tables (inboxes, inbound/outbound messages, events), delivers sends through
// a workpool with retries, and ingests inbound mail via the webhook in
// http.ts. Credentials are Convex env vars the component reads directly, so
// they never appear in function args or logs.

import { internalMutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { AgentMail } from "@agentmail/convex";
import { v } from "convex/values";

export const agentmail = new AgentMail(components.agentmail);

// The inbox id in AgentMail is the inbox email address.
export function agentmailInbox(): string | undefined {
  return process.env.AGENTMAIL_INBOX_ID;
}

export function agentmailConfigured(): boolean {
  return Boolean(process.env.AGENTMAIL_API_KEY && agentmailInbox());
}

// The agentmail_send tool calls this. sendMessage enqueues the email in the
// component's tables inside this transaction; a workpool action delivers it
// with bounded retries. Returns the outbound id delivery status is keyed on.
export const sendFromTool = internalMutation({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const inbox = agentmailInbox();
    if (!inbox) throw new Error("AGENTMAIL_INBOX_ID is not set");
    return await agentmail.sendMessage(ctx, inbox, {
      to: args.to,
      subject: args.subject,
      text: args.body,
      labels: ["agent"],
    });
  },
});

// Read-only status for the settings screen. Exposes the inbox address
// (public by nature, it receives mail) and never the key.
export const status = query({
  args: {},
  returns: v.object({
    configured: v.boolean(),
    inbox: v.union(v.string(), v.null()),
  }),
  handler: async () => {
    return {
      configured: agentmailConfigured(),
      inbox: agentmailInbox() ?? null,
    };
  },
});
