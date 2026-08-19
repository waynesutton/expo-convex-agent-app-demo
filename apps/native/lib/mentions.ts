// @mention parsing. Mentions are resolved on the client at send time and
// routed through runAgent's ordered botIds argument, so the backend needs no
// mention concept at all.

export type Mentionable = { _id: string; name: string };

// Find bots mentioned as "@Name" in the text, in the order they appear.
// Longest names match first so "@Maxwell" never half-matches a bot named
// "Max", and a word boundary is required after the name so "@Maxi" does not
// count as "@Max". Names with spaces work because we match the full name.
export function parseMentions<T extends Mentionable>(
  text: string,
  bots: T[]
): T[] {
  const lower = text.toLowerCase();
  const hits: Array<{ index: number; bot: T }> = [];
  const byLength = [...bots].sort((a, b) => b.name.length - a.name.length);

  for (const bot of byLength) {
    const needle = "@" + bot.name.toLowerCase();
    let from = 0;
    while (true) {
      const i = lower.indexOf(needle, from);
      if (i === -1) break;
      from = i + 1;
      // The @ must start the text or follow whitespace, so emails like
      // a@sage.com never count as a mention of a bot named Sage.
      const before = lower[i - 1];
      const boundaryBefore = before === undefined || /\s/.test(before);
      const after = lower[i + needle.length];
      const boundaryAfter = after === undefined || !/[a-z0-9]/i.test(after);
      // A longer bot name may already own this @; first match wins.
      const taken = hits.some((h) => h.index === i);
      if (boundaryBefore && boundaryAfter && !taken) {
        hits.push({ index: i, bot });
        break; // one hit per bot is enough; they respond once
      }
    }
  }

  return hits.sort((a, b) => a.index - b.index).map((h) => h.bot);
}

// The trailing "@query" token the user is currently typing, used by the
// composer to filter autocomplete suggestions. Returns null when the caret
// word is not a mention (e.g. mid-sentence text or an email like a@b.com,
// where the @ is not preceded by whitespace or start of input).
export function activeMentionQuery(text: string): string | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(text);
  return match ? match[2] : null;
}

// Replace the trailing "@query" with the chosen bot's full name.
export function insertMention(text: string, name: string): string {
  return text.replace(/@[^\s@]*$/, `@${name} `);
}
