import { ConvexError } from "convex/values";

// ---------------------------------------------------------------------------
// Server side content moderation. Everything a visitor can type flows through
// checkText before it hits the database, so the shared demo stays clean.
//
// Two layers:
// - Profanity is blocked everywhere, demo or not. To loosen this in a private
//   fork, remove the checkText calls from the mutations (search "checkText").
// - Links and length caps apply only when DEMO_MODE=true on the deployment,
//   so a fork keeps full functionality (bots read pasted links) by default.
//
// User keys are unrelated to this file and never reach the backend store.
// ---------------------------------------------------------------------------

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

// Blocked terms, matched against normalized whole words so ordinary words
// that merely contain a term (classic, assess, shellfish) pass fine.
const BLOCKED_WORDS = new Set([
  "fuck", "fucking", "fucked", "fucker", "motherfucker", "shit", "shitty",
  "bullshit", "asshole", "bitch", "bitches", "bastard", "cunt", "dick",
  "dickhead", "cock", "pussy", "slut", "whore", "douche", "douchebag",
  "jackass", "dumbass", "prick", "twat", "wanker", "bollocks", "nigger",
  "nigga", "faggot", "fag", "retard", "retarded", "kike", "spic", "chink",
  "wetback", "tranny", "coon", "porn", "porno",
]);

// Leetspeak folds so sh1t, a$$hole, and friends do not slip through.
// * and # survive normalization as single-character wildcards, so f*ck and
// f#ck match their uncensored forms below.
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
  "@": "a", "$": "s", "!": "i", "+": "t", "#": "*",
};

function normalize(text: string): string[] {
  const folded = text
    .toLowerCase()
    .split("")
    .map((ch) => LEET[ch] ?? ch)
    .join("");
  return folded.split(/[^a-z*]+/).filter((w) => w.length > 0);
}

// True when a token with * wildcards matches a blocked word of equal length.
function wildcardMatch(token: string): boolean {
  for (const word of BLOCKED_WORDS) {
    if (word.length !== token.length) continue;
    let matches = true;
    for (let i = 0; i < token.length; i++) {
      if (token[i] !== "*" && token[i] !== word[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

export function containsProfanity(text: string): boolean {
  const words = normalize(text);
  for (const w of words) {
    if (BLOCKED_WORDS.has(w)) return true;
    if (w.includes("*") && w.length > 2 && wildcardMatch(w)) return true;
  }
  // Catch spaced-out or punctuated variants of the worst terms by also
  // checking the fully collapsed string.
  const collapsed = words.join("").replace(/\*/g, "");
  for (const slur of ["nigger", "nigga", "faggot", "kike", "tranny"]) {
    if (collapsed.includes(slur)) return true;
  }
  return false;
}

// URL shapes: protocol links, www links, and bare domains on common TLDs.
const LINK_PATTERN =
  /(https?:\/\/|www\.)\S+|\b[a-z0-9][a-z0-9-]*\.(com|net|org|io|dev|app|ai|xyz|co|gg|me|link|site|online|top|click|info|biz)\b/i;

export function containsLink(text: string): boolean {
  return LINK_PATTERN.test(text);
}

// Demo message cap. Big enough for a real question, small enough to make
// paste-bombing pointless.
const DEMO_MAX_LENGTH = 2000;

// Validate visitor text. kind tunes the error copy; demo-only rules are
// skipped entirely when DEMO_MODE is off so forks keep full functionality.
export function checkText(
  text: string,
  kind: "message" | "name" | "title" = "message"
): void {
  if (containsProfanity(text)) {
    throw new ConvexError(
      kind === "message"
        ? "That message contains language this app does not allow. Please rephrase it."
        : "That text contains language this app does not allow. Try different wording."
    );
  }
  if (!isDemoMode()) return;
  if (text.length > DEMO_MAX_LENGTH) {
    throw new ConvexError(
      `Demo messages are capped at ${DEMO_MAX_LENGTH} characters. Fork the template to remove the limit.`
    );
  }
  if (kind === "message" && containsLink(text)) {
    throw new ConvexError(
      "Links are disabled in this public demo. Fork the template to paste links freely."
    );
  }
}
