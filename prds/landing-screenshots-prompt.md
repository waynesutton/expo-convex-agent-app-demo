# Landing page: hide the prompt pile, add screenshots

Created: 2026-08-17 02:15 UTC
Last Updated: 2026-08-17 02:22 UTC
Status: Done

## Problem

Two issues on landing/index.html:

1. The one prompt setup section renders the full setup prompt as a 300px
   scrolling pile of monospace text. Nobody reads it there; they copy it.
   The wall of text pushes the real content down and looks like a dump.
2. The page has zero pictures of the product. A template landing page with
   no screenshots asks visitors to imagine the app.

## Proposed solution

- Keep the prompt text in the page (hidden) so both copy buttons still
  work, but replace the visible pile with a compact card: one line of
  context and a single button reading "Copy the setup prompt for your
  agents". A small meta line notes what the prompt does (installs,
  provisions Convex, hands you a QR code).
- New screenshots section with three phone frames captured from the live
  web app at a 390px viewport: home roster, a seeded demo chat, and
  settings (BYOK plus the AgentMail card). Images live in
  landing/screens/, lazy loaded, sized with aspect-ratio so there is no
  layout shift, in a grid that is 3-up on desktop and stacks on mobile.
- Confirm the Convex components list is current (push notifications and
  @agentmail/convex are both listed).

## Files to change

- landing/index.html (prompt card, screenshots section, styles)
- landing/screens/home.png, chat.png, settings.png (new assets)
- files.md, changelog.md, task.md

## Edge cases

- Copy still works from both buttons since the prompt text stays in the
  DOM, just not displayed.
- Images declare width/height via aspect-ratio so CLS stays at zero.
- On narrow screens the grid stacks to one column and images stay inside
  the viewport (max-width 100%).

## Verification

- Open landing/index.html in the browser: no prompt pile, copy buttons
  copy the full prompt, three screenshots render and stack at 390px.

## Task completion log

- 2026-08-17 02:15 UTC Created.
- 2026-08-17 02:22 UTC Done. Prompt pile replaced with a compact card
  (hidden pre keeps copy working, verified 1766 chars intact). Three
  screenshots captured from the running web app at a 375x640 viewport,
  2x scale, saved to landing/screens/. Verified in browser: card renders
  with one button, images keep 375:640 aspect ratio, grid stacks to one
  column at 390px (image measured 298x510). Components list confirmed
  current with push notifications and @agentmail/convex.
