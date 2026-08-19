# CLAUDE.md

Read AGENTS.md. It is the source of truth for this repo.

Quick reminders for Claude Code:
- Setup flow and hard rules live in AGENTS.md.
- Convex Auth only, not yet wired. Never add Better Auth, Clerk, or WorkOS.
- User LLM keys never touch the database.
- Run `npx convex dev` from packages/backend before typechecking; it generates convex/_generated.
