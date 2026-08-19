# Design

expo-demo reads like a messaging app for AI teammates: a soft grey ground, ink for the user's voice, and a restrained identity palette that belongs to the bots alone. Light mode is the default. No purple anywhere.

## Tokens

Defined once in `apps/native/lib/theme.ts`. Components never hardcode colors.

| Token | Value | Use |
|---|---|---|
| `paper` | `#FAFAFA` | App ground, headers, sidebar (soft grey, not pure white) |
| `mist` | `#F2F2F2` | Raised surfaces: bot bubbles, cards |
| `field` | `#EAEAEA` | Inset controls: inputs, swatch wells |
| `line` | `#E0E0E0` | Standard separation |
| `lineSoft` | `#EAEAEA` | Softer separation |
| `ink` | `#171717` | Primary text, user bubble, primary buttons |
| `slate` | `#4D4D4D` | Secondary text |
| `faint` | `#888888` | Metadata, timestamps, placeholders |
| `signal` | `#EE0000` | Errors only. Never decoration. |
| `onInk` | `#FFFFFF` | Text on ink surfaces |

The ground is `#FAFAFA` instead of pure white so bubbles (`mist`), inputs (`field`), and the ink user bubble all read as distinct surfaces without heavy borders.

Bot identity colors live in `BOT_COLORS`: ink `#171717`, graphite `#444444`, slate `#888888`, blue `#0070F3`, teal `#50E3C2`, amber `#F5A623`, coral `#FF4D4D`. Greys lead, three accents follow, no purple. Each bot claims one at creation and keeps it across the roster, sidebar, chat header, and avatars. Light colors (teal, amber) draw a dark initial via `botInitialColor`.

## Typography

Quiet by rule. No display sizes, no heavy weights.

- The wordmark is set in platform monospace (Menlo / Roboto Mono) at 14 to 15, weight 400. It reads like a package name because it is one. Never bold.
- Bot names and screen titles are weight 500, never 600 or above. Buttons and section labels cap at 600. Nothing in the app uses 700 or 800.
- Body text is system sans at 13 to 15. Hierarchy comes from color (`ink`, `slate`, `faint`) and spacing, not from size or weight jumps.
- Monospace marks machine output: tool calls, device IDs, timestamps.

## The signature element

Tool calls render as bordered monospace cards inside the chat, like a terminal transcript. The agent shows its work, and that transparency is the product's personality. Keep everything else quiet so these cards and the bot colors carry the identity.

## Rules

- Gray builds structure. Color means something: bot identity, primary action, or error.
- Red means broken. If nothing is broken, no red on screen.
- User messages sit right aligned on `ink`. Bot messages sit left aligned on `mist` with the bot's avatar color for attribution.
- Motion is minimal: streaming shows three breathing dots (`ThinkingDots`), nothing else animates.
- Respect the platform: safe areas, dynamic type, reduced motion.

## Greyred style (landing page)

The landing page at `landing/index.html` uses the same grey tokens with one deliberate difference: red is the accent, not the error color. We call this greyred. Grey does all the structural work, exactly like the app, and a single muted red (`#C03D2E`) carries the brand: the wordmark underscore, the primary CTA, section markers, and list bullets. The app's own error red (`signal`, `#EE0000`) stays inside the app.

Rules for greyred:

- One red. No second accent, no gradients, no tinted surfaces.
- No header subtext. The headline stands alone.
- Monospace section headers prefixed with `//`, like source comments.
- Feature cells share one `mist` surface separated by 2px gaps, not bordered cards.
- The setup prompt is the centerpiece, shown in full and copyable, because the prompt is the product's onboarding.

The app keeps red for errors only. The landing page is the one surface where red means expo-demo.
