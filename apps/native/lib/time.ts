// Compact relative timestamps for the roster and sidebar, in the style of a
// messages app: "now", "12m", "3h", "Tue", "Aug 4".
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const then = new Date(timestamp);
  const days = Math.floor(hours / 24);
  if (days < 7) return DAY_NAMES[then.getDay()];
  return `${MONTH_NAMES[then.getMonth()]} ${then.getDate()}`;
}
