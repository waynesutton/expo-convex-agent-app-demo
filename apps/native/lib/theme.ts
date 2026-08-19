// Design tokens. Light-first, in the spirit of a messaging app for AI
// teammates: a soft grey ground so bubbles and inputs read as surfaces,
// ink for the user's voice and primary actions, and a restrained identity
// palette that belongs to the bots alone. Components never hardcode colors.
// See docs/design.md.
import { Platform, type TextStyle } from "react-native";

export const theme = {
  colors: {
    paper: "#FAFAFA", // app ground, headers, sidebar
    mist: "#F2F2F2", // raised surfaces: bot bubbles, cards
    field: "#EAEAEA", // inset controls: inputs, swatch wells
    line: "#E0E0E0", // standard separation
    lineSoft: "#EAEAEA", // softer separation
    ink: "#171717", // primary text, user bubble, primary buttons
    slate: "#4D4D4D", // secondary text
    faint: "#888888", // metadata, timestamps, placeholders
    signal: "#EE0000", // errors only
    onInk: "#FFFFFF", // text on ink surfaces
  },
  space: (n: number) => n * 4,
  radius: { card: 14, bubble: 18, input: 22, pill: 999 },
  mono: { fontFamily: "Menlo" as const }, // Roboto Mono renders on Android
} as const;

// React Native Web draws the browser's focus ring around focused TextInputs.
// The field background already signals focus, so every input spreads this
// into its style array. outlineStyle is web only, hence the cast; it is a
// no-op on native.
export const noFocusRing: TextStyle | null =
  Platform.OS === "web"
    ? ({ outlineStyle: "none" } as unknown as TextStyle)
    : null;

// Bot identity palette. Each bot claims one color at creation; it follows
// the bot through the roster, sidebar, chat header, and message avatars.
// Greys lead, with three accents. No purple.
export const BOT_COLORS = {
  ink: "#171717",
  graphite: "#444444",
  slate: "#888888",
  blue: "#0070F3",
  teal: "#50E3C2",
  amber: "#F5A623",
  coral: "#FF4D4D",
} as const;

export type BotColorKey = keyof typeof BOT_COLORS;

export const BOT_COLOR_KEYS = Object.keys(BOT_COLORS) as BotColorKey[];

// Light identity colors need a dark initial to stay readable.
const LIGHT_BOT_COLORS: ReadonlySet<string> = new Set(["teal", "amber"]);

// Resolve a stored color key to a hex value. Unknown keys (including keys
// from older palettes) fall back to ink so an avatar never goes invisible.
export function botColor(key: string): string {
  return BOT_COLORS[key as BotColorKey] ?? theme.colors.ink;
}

// The initial drawn on top of the identity color.
export function botInitialColor(key: string): string {
  return LIGHT_BOT_COLORS.has(key) ? theme.colors.ink : theme.colors.onInk;
}
