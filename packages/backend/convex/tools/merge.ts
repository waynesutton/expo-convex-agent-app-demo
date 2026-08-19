import { Tool } from "./types";

// Merge: one unified API over HRIS, ATS, CRM, ticketing, accounting, and
// file storage integrations. Docs: https://docs.merge.dev/merge-unified/overview
// Needs two credentials: the workspace API key and the linked account token
// Merge issues after an end user connects an integration through Merge Link.
const MERGE_BASE = "https://api.merge.dev/api";

// Category -> common resources, so the model asks for real endpoints.
const CATEGORIES: Record<string, string[]> = {
  hris: ["employees", "time-off", "payroll-runs"],
  ats: ["candidates", "jobs", "applications"],
  ticketing: ["tickets", "projects", "users"],
  crm: ["contacts", "accounts", "opportunities"],
  accounting: ["invoices", "contacts", "payments"],
  filestorage: ["files", "folders", "drives"],
};

function apiKey(): string | undefined {
  return process.env.MERGE_API_KEY;
}

function accountToken(): string | undefined {
  return process.env.MERGE_ACCOUNT_TOKEN;
}

export const mergeList: Tool = {
  definition: {
    name: "merge_list",
    description:
      "List records from the workspace's connected business tools through the Merge unified API. Categories and resources: hris (employees, time-off, payroll-runs), ats (candidates, jobs, applications), ticketing (tickets, projects, users), crm (contacts, accounts, opportunities), accounting (invoices, contacts, payments), filestorage (files, folders, drives). Use when the user asks about employees, candidates, tickets, deals, invoices, or stored files.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: Object.keys(CATEGORIES),
          description: "Which Merge category to query",
        },
        resource: {
          type: "string",
          description: "The resource to list within the category, e.g. tickets",
        },
      },
      required: ["category", "resource"],
    },
  },
  available: () => Boolean(apiKey() && accountToken()),
  execute: async (input) => {
    const category = String(input.category);
    const resource = String(input.resource);
    const allowed = CATEGORIES[category];
    if (!allowed) {
      return `Unknown category "${category}". Use one of: ${Object.keys(CATEGORIES).join(", ")}.`;
    }
    if (!allowed.includes(resource)) {
      return `Unknown resource "${resource}" for ${category}. Use one of: ${allowed.join(", ")}.`;
    }

    const res = await fetch(
      `${MERGE_BASE}/${category}/v1/${resource}?page_size=10`,
      {
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          "X-Account-Token": accountToken() ?? "",
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Merge ${category}/${resource} failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    // Keep tool output mobile sized; ten records is plenty for a chat reply.
    return JSON.stringify(data?.results ?? data).slice(0, 12000);
  },
};
