// HTTP routes. The AgentMail webhook makes inbound mail land in the
// component's tables reactively. convex.config.ts sets httpPrefix "/api"
// (the static hosting component owns the site root), so this route is
// served at https://<your-deployment>.convex.site/api/agentmail/webhook.
// Register that URL in the AgentMail dashboard and set
// AGENTMAIL_WEBHOOK_SECRET. Until then the route is inert.

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { agentmail } from "./email";

const http = httpRouter();

http.route({
  path: "/agentmail/webhook",
  method: "POST",
  // The component types handleWebhook against a mutation ctx, but its docs
  // mount it in an httpAction; the action ctx's runMutation is compatible at
  // runtime (the extra options parameter is optional), so the cast is safe.
  handler: httpAction(async (ctx, req) =>
    agentmail.handleWebhook(
      ctx as unknown as Parameters<typeof agentmail.handleWebhook>[0],
      req
    )
  ),
});

export default http;
